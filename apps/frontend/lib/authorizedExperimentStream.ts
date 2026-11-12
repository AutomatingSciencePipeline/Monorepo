import 'server-only';
import type { ChangeStream, ChangeStreamDocument, Document } from 'mongodb';

type StreamOptions = {
    signal: AbortSignal;
    watch: ChangeStream<Document>;
    isAuthorized: () => Promise<boolean>;
    query: () => Promise<unknown>;
    invalidatesSnapshot: (change: ChangeStreamDocument<Document>) => boolean;
};

export function createAuthorizedExperimentStream({
    signal, watch, isAuthorized, query, invalidatesSnapshot,
}: StreamOptions) {
    let cancelStream = () => {};
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
        start(controller) {
            let closed = false;
            let busy = false;
            let snapshotPending = true;
            let accessVersion = 0;
            let heartbeat: ReturnType<typeof setInterval>;
            const abort = () => close();
            const close = (closeController = true) => {
                if (closed) return;
                closed = true;
                clearInterval(heartbeat);
                signal.removeEventListener('abort', abort);
                void Promise.resolve(watch.close()).catch(() => undefined);
                if (closeController) controller.close();
            };
            cancelStream = () => close(false);

            const checkAuthorization = async () => {
                try {
                    const authorized = await isAuthorized();
                    if (!authorized) close();
                    return authorized && !closed;
                } catch {
                    // Suspend delivery until a fresh check succeeds, without forcing reconnects.
                    return false;
                }
            };

            const send = async () => {
                if (closed || busy) return;
                busy = true;
                try {
                    do {
                        const sendSnapshot = snapshotPending;
                        snapshotPending = false;
                        if (!await checkAuthorization()) {
                            snapshotPending ||= sendSnapshot;
                            return;
                        }
                        if (closed) return;
                        if (sendSnapshot) {
                            const version = accessVersion;
                            const documents = await query();
                            if (!await checkAuthorization()) {
                                snapshotPending = true;
                                return;
                            }
                            if (!closed && version === accessVersion) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(documents)}\n\n`));
                            }
                        } else if (!closed) {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        }
                    } while (snapshotPending && !closed);
                } catch {
                    close();
                } finally {
                    busy = false;
                }
            };

            signal.addEventListener('abort', abort, { once: true });
            watch.on('error', () => close());
            watch.on('change', (change) => {
                // Access changes invalidate captured rows; ordinary progress keeps flowing.
                if (invalidatesSnapshot(change)) accessVersion++;
                snapshotPending = true;
                return send();
            });
            if (signal.aborted) {
                close();
                return;
            }
            // A busy snapshot or authorization check also suppresses overlapping heartbeats.
            heartbeat = setInterval(send, 2500);
            void send();
        },
        cancel() { cancelStream(); },
    });
}
