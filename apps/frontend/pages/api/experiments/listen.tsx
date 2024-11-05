import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { ExperimentData } from "../../../firebase/db_types";
import { ChangeStream, WithId, Document } from "mongodb";

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
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Listen to changes in the collection
        changeStream.on("change", async () => {
            const updatedDocuments = await experimentsCollection
                .find({ creator: uid })
                .toArray();

            const result = updatedDocuments.map((doc: WithId<Document>) => {
                const { _id, ...rest } = doc;
                return { id: _id.toString(), ...rest } as Partial<ExperimentData>;
            });

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
