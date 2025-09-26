// app/api/experiments/stream/route.ts

import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { WithId, Document } from 'mongodb';
import { NextRequest } from 'next/server';
import { auth } from '../../../../auth';

export const runtime = 'nodejs'; // To ensure we are in a serverful Node.js environment
export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Make sure the user is an admin
  if (!session.user?.role || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

  const encoder = new TextEncoder();
  const heartbeatIntervalMs = 2500;

  const stream = new ReadableStream({
    async start(controller) {
      const changeStream = experimentsCollection.watch([], { fullDocument: 'updateLookup' });

      // Send initial unfinished experiments
      const initDocs = await experimentsCollection.find({ finished: false }).toArray();
      const initArray = convertToExpsArray(initDocs);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initArray)}\n\n`));

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, heartbeatIntervalMs);

      changeStream.on('change', async () => {
        const updatedDocs = await experimentsCollection.find({ finished: false }).toArray();
        const updatedArray = convertToExpsArray(updatedDocs);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(updatedArray)}\n\n`));
      });

      const abort = req.signal;
      abort.addEventListener('abort', () => {
        changeStream.close();
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function convertToExpsArray(arr: WithId<Document>[]) {
  return arr.map((doc: WithId<Document>) => ({
    id: doc._id.toString(),
    name: doc.name || 'Untitled',
    creator: doc.creator || 'Unknown',
    description: doc.description || 'No description',
    workers: doc.workers ?? 0,
    expId: doc._id || '',
    trialExtraFile: doc.trialExtraFile || '',
    trialResult: doc.trialResult || '',
    trialResultLineNumber: doc.trialResultLineNumber ?? 0,
    timeout: doc.timeout ?? 0,
    keepLogs: doc.keepLogs ?? false,
    scatter: doc.scatter ?? false,
    scatterIndVar: doc.scatterIndVar || '',
    scatterDepVar: doc.scatterDepVar || '',
    dumbTextArea: doc.dumbTextArea || '',
    created: doc.created?.toString() || '0',
    hyperparameters: doc.hyperparameters ?? {},
    finished: doc.finished ?? false,
    estimatedTotalTimeMinutes: doc.estimatedTotalTimeMinutes ?? 0,
    expToRun: doc.expToRun ?? 0,
    file: doc.file || '',
    status: doc.status || 'OK',
    startedAtEpochMillis: doc.startedAtEpochMillis ?? 0,
    finishedAtEpochMilliseconds: doc.finishedAtEpochMilliseconds ?? 0,
    passes: doc.passes ?? 0,
    fails: doc.fails ?? 0,
    totalExperimentRuns: doc.totalExperimentRuns ?? 0,
  }));
}
