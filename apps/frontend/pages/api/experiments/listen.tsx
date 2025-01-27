import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { WithId, Document } from "mongodb";

export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

export const config = {
    api: {
        bodyParser: false, // Disables body parsing
    },
};

export default async function handler(req, res) {
    const { uid } = req.query;

    if (!uid) {
        return;
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    // Set up a Change Stream for real-time updates
    const pipeline = [
        {
            $match: {
                $or: [
                    { "fullDocument.creator": uid },          // Match insert or update with the creator field
                    { operationType: "delete", "documentKey._id": { $exists: true } },  // Handle deletion events
                    //Check if uid is in the sharedUsers array
                    { "fullDocument.sharedUsers": { $in: [uid] } },
                    //Check if uid is removed
                    { operationType: "update", "updateDescription.updatedFields.sharedUsers": { $nin: [uid] } }

                ]
            }
        }
    ];
    const options = { fullDocument: "updateLookup" };
    const changeStream = experimentsCollection.watch(pipeline, options);

    // Set up real-time streaming of changes to the client using SSE
    // res.setHeader("Access-Control-Allow-Origin", "*");
    // res.setHeader("Cache-Control", "no-cache");
    // res.setHeader("Connection", "keep-alive");
    // res.setHeader("Content-Type", "text/event-stream");
    res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Encoding': 'none',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
    });

    const HEARTBEAT_INTERVAL = 2500; // 5 seconds (adjust this as needed)
    const intervalId = setInterval(() => {
        // Send a heartbeat message to keep the connection alive
        res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL);

    const initDocs = await experimentsCollection
        .find({ $or: [{ 'creator': uid }, { 'sharedUsers': { $in: [uid] } }] })
        .toArray();
    const initArray = convertToExpsArray(initDocs);
    res.write(`data: ${JSON.stringify(initArray)}\n\n`);

    // Listen to changes in the collection
    changeStream.on("change", async () => {
        const updatedDocuments = await experimentsCollection
            .find({ $or: [{ 'creator': uid }, { 'sharedUsers': { $in: [uid] } }] })
            .toArray();

        const result = convertToExpsArray(updatedDocuments);
        // Send the updated experiments to the client
        res.write(`data: ${JSON.stringify(result)}\n\n`);
    });

    // Close the change stream and client connection when the request ends
    req.on("close", () => {
        changeStream.close();
        clearInterval(intervalId);
        res.end()
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
        status: doc.status || "OK",
        startedAtEpochMillis: doc.startedAtEpochMillis ?? 0,
        finishedAtEpochMilliseconds: doc.finishedAtEpochMilliseconds ?? 0,
        passes: doc.passes ?? 0,
        fails: doc.fails ?? 0,
        totalExperimentRuns: doc.totalExperimentRuns ?? 0,
    }));
}