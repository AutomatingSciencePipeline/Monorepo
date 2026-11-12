import { NextRequest, NextResponse } from 'next/server';
import { AuditUnavailableError, cancelExperimentFromCli } from '../../../../lib/experimentCancel';
import type { CancelResult } from '../../../../lib/experimentCancel';
import { authenticateCli, invalidArguments, isNonEmptyString, isObjectId, readJsonObject } from '../request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// HTTP status for each refusal. The error code in the body is the stable contract.
const ERROR_STATUS: Record<string, number> = {
    not_found: 404,
    forbidden: 403,
    not_cancellable: 409,
    backend_error: 502,
    status_update_failed: 500,
};

function respond(eid: string, result: CancelResult): Response {
    if (result.ok) {
        // 202: Kubernetes accepted the Job deletion, but the runner may still be shutting down.
        return NextResponse.json({
            success: true,
            eid,
            outcome: result.outcome,
            status: result.status,
            job_termination_confirmed: false,
        }, { status: result.outcome === 'cancel_requested' ? 202 : 200 });
    }
    const body: Record<string, unknown> = { success: false, error: result.error };
    if (result.status !== undefined) body.status = result.status;
    if (result.jobDeletionRequested) body.job_deletion_requested = true;
    return NextResponse.json(body, { status: ERROR_STATUS[result.error] ?? 500 });
}

export async function POST(req: NextRequest) {
    const cancelReq = await readJsonObject(req);

    if (!cancelReq || !isNonEmptyString(cancelReq.token) || !isObjectId(cancelReq.eid)) {
        return invalidArguments();
    }
    const eid = cancelReq.eid;

    const auth = await authenticateCli(cancelReq.token);
    if (!auth.user) return auth.response;

    try {
        return respond(eid, await cancelExperimentFromCli(eid, String(auth.user._id)));
    } catch (error) {
        if (error instanceof AuditUnavailableError) {
            // Fail closed: the audit record could not be written, so nothing was cancelled.
            return NextResponse.json({ success: false, error: 'degraded' }, { status: 503 });
        }
        return NextResponse.json({ success: false, error: 'Other' }, { status: 500 });
    }
}
