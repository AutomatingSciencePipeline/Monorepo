// app/api/start/[expIdToStart]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '../../../../../auth';
import { backendAuthHeaders } from '../../../../../lib/backendAuth';
import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../../lib/mongodb';

const BACKEND_PORT = process.env.BACKEND_PORT || 5050;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ expIdToStart: string }> }
) {
  const { expIdToStart } = await params;

  if (!expIdToStart || typeof expIdToStart !== 'string') {
    return NextResponse.json({ response: 'Missing experiment ID' }, { status: 400 });
  }
  if (!/^[0-9a-f]{24}$/.test(expIdToStart)) {
    return NextResponse.json({ response: 'Invalid experiment ID' }, { status: 400 });
  }

  // Only the creator of an experiment (or an admin) may start it
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ response: 'Unauthorized' }, { status: 401 });
  }
  const client = await clientPromise;
  const experiment = await client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS)
    .findOne({ _id: new ObjectId(expIdToStart) }, { projection: { creator: 1 } });
  if (!experiment) {
    return NextResponse.json({ response: 'Experiment not found' }, { status: 404 });
  }
  if (experiment.creator !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ response: 'Forbidden' }, { status: 403 });
  }

  let key: string | undefined;

  try {
    const body = await req.json();
    key = body.key;
  } catch {
    return NextResponse.json({ response: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const url = `http://glados-service-backend:${BACKEND_PORT}/experiment`;
    const backendResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await backendAuthHeaders()),
      },
      body: JSON.stringify({ experiment: { id: expIdToStart, key } }),
    });

    if (!backendResponse.ok) {
      throw new Error(`Fetch failed: ${backendResponse.status}`);
    }
    
    return NextResponse.json({ response: backendResponse }, { status: backendResponse.status });
  } catch (error) {
    console.warn('Error contacting server: ', error);
    return NextResponse.json(
      { response: 'Could not reach the server to request start of the experiment' },
      { status: 500 }
    );
  }
}
