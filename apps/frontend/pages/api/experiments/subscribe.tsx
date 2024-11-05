import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { WithId, Document, ObjectId } from "mongodb";

export default async function handler(req, res) {
    const { expId } = req.query;

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    // Set up a Change Stream for real-time updates
    const pipeline = [{ $match: { "fullDocument._id": expId } }];
    const changeStream = experimentsCollection.watch(pipeline);

    // Set up real-time streaming of changes to the client using SSE
    res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Encoding': 'none',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
    });

    const HEARTBEAT_INTERVAL = 5000; // 5 seconds (adjust this as needed)
    const intervalId = setInterval(() => {
        // Send a heartbeat message to keep the connection alive
        res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL);

    const initDocs = await experimentsCollection
        .find({ '_id': new ObjectId(expId) })
        .toArray();
    console.log(initDocs.length);
    const initArray = convertToExpsArray(initDocs)[0];
    res.write(`data: ${JSON.stringify(initArray)}\n\n`);

    console.log("creating change stream");
    console.log(changeStream);
    // Listen to changes in the collection
    changeStream.on("change", async () => {
        const updatedDocuments = await experimentsCollection
            .find({ '_id': new ObjectId(expId) })
            .toArray();

        const result = convertToExpsArray(updatedDocuments)[0];
        // Send the updated experiments to the client
        res.write(`data: ${JSON.stringify(result)}\n\n`);
    });

    // Close the change stream and client connection when the request ends
    req.socket.on("close", () => {
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
        expId: doc.expId || "",
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
