import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from "../../../lib/mongodb";
import { WithId, Document } from "mongodb";
import { Server } from 'ws'

export const config = {
    api: {
        bodyParser: false, // Disable body parser to handle WebSocket upgrade
    },
};

export function SOCKET(
    client: import('ws').WebSocket,
    request: import('http').IncomingMessage,
    server: import('ws').WebSocketServer
  ) {
    console.log('A client connected');
  
    client.on('message', (message) => {
      console.log('Received message:', message);
      client.send(message);
    });
  
    client.on('close', () => {
      console.log('A client disconnected');
    });
  }

// export default async function handler(req, res) {
//     const { uid } = req.query;

//     if (!uid) {
//         res.status(400).send('User ID is required');
//         return;
//     }

//     // Connect to MongoDB
//     const client = await clientPromise;
//     const db = client.db(DB_NAME);
//     const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

//     // Set up a Change Stream for real-time updates
//     const pipeline = [{ $match: { "fullDocument.creator": uid } }];
//     const options = { fullDocument: "updateLookup" };
//     const changeStream = experimentsCollection.watch(pipeline, options);

//     // Create a new WebSocket server with `noServer` set to true
//     const wss = new Server({ noServer: true });

//     wss.on('connection', async (ws) => {
//         console.log("Made WebSocket connection!");

//         // Set up heartbeat to keep connection alive
//         const HEARTBEAT_INTERVAL = 2500; // Adjust this as needed (in milliseconds)
//         const intervalId = setInterval(() => {
//             ws.send("heartbeat"); // Send heartbeat message
//         }, HEARTBEAT_INTERVAL);

//         // Initial data fetch and send it to the client
//         const initDocs = await experimentsCollection.find({ creator: uid }).toArray();
//         const initArray = convertToExpsArray(initDocs);
//         ws.send(JSON.stringify(initArray));

//         // Listen to changes in the collection
//         changeStream.on('change', async () => {
//             const updatedDocuments = await experimentsCollection.find({ creator: uid }).toArray();
//             const result = convertToExpsArray(updatedDocuments);
//             // Send the updated experiments to the client
//             ws.send(JSON.stringify(result));
//         });

//         // Clean up when WebSocket closes
//         ws.on('close', () => {
//             clearInterval(intervalId); // Clear heartbeat interval
//             changeStream.close(); // Close change stream when connection is closed
//         });
//     });

//     // Handle WebSocket upgrade request
//     if (!res.writableEnded) {
//         res.writeHead(101, {
//             'Connection': 'Upgrade',
//             'Upgrade': 'websocket',
//             'Cache-Control': 'no-cache',
//             'Content-Type': 'text/plain',
//         });
//     }

//     // Handle the WebSocket upgrade and pass the request to the WebSocket server
//     wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
//         wss.emit('connection', ws, req);
//     });

//     // Clean up when request ends
//     req.on("close", () => {
//         wss.close();
//     });
// }

// Utility function to convert MongoDB documents to the desired structure
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
