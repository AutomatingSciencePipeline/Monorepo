import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { WithId, Document } from "mongodb";

export default async function handler(req, res) {
    const { uid } = req.query;

    if (req.method === "GET") {
        // Connect to MongoDB
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

        // Set up a Change Stream for real-time updates
        const pipeline = [{ $match: { "fullDocument.creator": uid } }];
        const options = { fullDocument: "updateLookup" };
        const changeStream = experimentsCollection.watch(pipeline, options);

        // Set up real-time streaming of changes to the client using SSE
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Content-Type", "text/event-stream");

        const initDocs = await experimentsCollection
            .find({ 'creator': uid })
            .toArray();
        const initArray = convertToExpsArray(initDocs);
        res.write(`data: ${JSON.stringify(initArray)}\n\n`);

        // Listen to changes in the collection
        changeStream.on("change", async () => {
            const updatedDocuments = await experimentsCollection
                .find({ 'creator': uid })
                .toArray();

            const result = convertToExpsArray(updatedDocuments);
            // Send the updated experiments to the client
            res.write(`data: ${JSON.stringify(result)}\n\n`);
        });

        // Close the change stream and client connection when the request ends
        req.on("close", () => {
            changeStream.close();
            client.close();
        });
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}

function convertToExpsArray(arr) {
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
