// pages/api/experiments/listen.js
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { WebSocketServer } from 'ws';

let wss; // WebSocket server instance

export const config = {
    api: {
        bodyParser: false, // Disable body parsing for WebSocket handling
    },
};

async function handler(req, res) {
    if (!wss) {
        // Initialize WebSocket server
        wss = new WebSocketServer({ noServer: true });

        wss.on('connection', async (ws, request) => {
            const uid = new URL(request.url, `http://${request.headers.host}`).searchParams.get('uid');
            if (!uid) {
                ws.close();
                return;
            }

            console.log(`WebSocket connection established for user: ${uid}`);

            // MongoDB Change Stream setup
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

            const pipeline = [{ $match: { "fullDocument.creator": uid } }];
            const options = { fullDocument: "updateLookup" };
            const changeStream = experimentsCollection.watch(pipeline, options);

            // Initial data fetch and send to client
            const initDocs = await experimentsCollection.find({ creator: uid }).toArray();
            ws.send(JSON.stringify(initDocs.map(doc => formatExperiment(doc))));

            // Listen for MongoDB changes
            changeStream.on('change', async () => {
                const updatedDocuments = await experimentsCollection.find({ creator: uid }).toArray();
                ws.send(JSON.stringify(updatedDocuments.map(doc => formatExperiment(doc))));
            });

            ws.on('close', () => {
                console.log(`WebSocket connection closed for user: ${uid}`);
                changeStream.close();
            });
        });
    }

    if (req.method === 'GET') {
        res.status(200).send('WebSocket server is running');
    } else {
        res.status(405).end(); // Method Not Allowed
    }
}

// Upgrade WebSocket connection
export function webSocketUpgrade(server) {
    server.on('upgrade', (req, socket, head) => {
        if (req.url.startsWith('/api/experiments/listen')) {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        } else {
            socket.destroy();
        }
    });
}

function formatExperiment(doc) {
    return {
        id: doc._id.toString(),
        name: doc.name || "Untitled",
        creator: doc.creator || "Unknown",
        description: doc.description || "No description",
        verbose: doc.verbose ?? false,
        workers: doc.workers ?? 0,
        expId: doc._id || "",
        trialExtraFile: doc.trialExtraFile || "",
        trialResult: doc.trialResult || "",
        timeout: doc.timeout ?? 0,
        keepLogs: doc.keepLogs ?? false,
        scatter: doc.scatter ?? false,
        scatterIndVar: doc.scatterIndVar || "",
        scatterDepVar: doc.scatterDepVar || "",
        dumbTextArea: doc.dumbTextArea || "",
        created: doc.created?.toString() || "0",
        hyperparameters: doc.hyperparameters ?? {},
        finished: doc.finished ?? false,
        estimatedTotalTimeMinutes: doc.estimatedTotalTimeMinutes ?? 0,
        expToRun: doc.expToRun ?? 0,
        file: doc.file || "",
        startedAtEpochMillis: doc.startedAtEpochMillis ?? 0,
        finishedAtEpochMilliseconds: doc.finishedAtEpochMilliseconds ?? 0,
        passes: doc.passes ?? 0,
        fails: doc.fails ?? 0,
        totalExperimentRuns: doc.totalExperimentRuns ?? 0,
    };
}
