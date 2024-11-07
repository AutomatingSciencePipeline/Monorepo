import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { WithId, Document } from "mongodb";
import WebSocket from 'ws';

export default async function handler(req, res) {
    const { uid } = req.query;

    if (!uid) {
        return;
    }

    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', async (ws) => {
        console.log("Made Websocket connection!");

        const HEARTBEAT_INTERVAL = 2500; // 5 seconds (adjust this as needed)
        const intervalId = setInterval(() => {
            // Send a heartbeat message to keep the connection alive
            ws.send(":heartbeat");
        }, HEARTBEAT_INTERVAL);

        const initDocs = await experimentsCollection
            .find({ 'creator': uid })
            .toArray();
        const initArray = convertToExpsArray(initDocs);
        ws.send(`data: ${JSON.stringify(initArray)}\n\n`);

        // Listen to changes in the collection
        changeStream.on("change", async () => {
            const updatedDocuments = await experimentsCollection
                .find({ 'creator': uid })
                .toArray();

            const result = convertToExpsArray(updatedDocuments);
            // Send the updated experiments to the client
            ws.send(`data: ${JSON.stringify(result)}\n\n`);
        });

        ws.on('close', () => {
            changeStream.close();
            clearInterval(intervalId);
        });
    });

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    // Set up a Change Stream for real-time updates
    const pipeline = [{ $match: { "fullDocument.creator": uid } }];
    const options = { fullDocument: "updateLookup" };
    const changeStream = experimentsCollection.watch(pipeline, options);

    if (!res.writableEnded) {
        res.writeHead(101, {
            Connection: 'upgrade',
            'Content-Encoding': 'none',
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/plain',
            'Upgrade': 'websocket'
        });
    }

    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), function done(ws) {
        wss.emit('connection', ws, req);
    });




    // Close the change stream and client connection when the request ends
    req.on("close", () => {
        wss.close();
    });

}

function convertToExpsArray(arr: WithId<Document>[]) {
    return arr.map((doc: WithId<Document>) => ({
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
    }));
}