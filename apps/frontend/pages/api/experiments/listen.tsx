import { ExperimentData } from "../../../firebase/db_types";
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { ChangeStream, WithId, Document } from "mongodb";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { uid } = req.query;

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    // Set up a Change Stream to listen for changes
    const pipeline = [{ $match: { "fullDocument.creator": uid } }];
    const changeStream = experimentsCollection.watch(pipeline);

    // Send updates to the client in real-time
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    changeStream.on("change", async () => {
      const updatedDocuments = await experimentsCollection
        .find({ creator: uid })
        .toArray();

      // Map documents to Partial<ExperimentData>[]
      const result: Partial<ExperimentData>[] = updatedDocuments.map((doc: WithId<Document>) => {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest } as Partial<ExperimentData>;
      });

      res.write(`data: ${JSON.stringify(result)}\n\n`);
    });

    // Handle cleanup when the connection closes
    req.on("close", () => {
      changeStream.close();
      client.close();
    });
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}