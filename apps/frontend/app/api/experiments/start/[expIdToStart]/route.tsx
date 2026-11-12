// app/api/start/[expIdToStart]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '../../../../../auth';
import { backendAuthHeaders } from '../../../../../lib/backendAuth';
import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../../lib/mongodb';
import { authenticateCli, isNonEmptyString, isObjectId, readJsonObject } from '../../../cli/request';

const BACKEND_PORT = process.env.BACKEND_PORT || 5050;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ expIdToStart: string }> }
) {
  const { expIdToStart } = await params;

  if (!isObjectId(expIdToStart)) {
    return NextResponse.json({ response: 'Invalid experiment ID' }, { status: 400 });
  }

  const body = await readJsonObject(req);
  if (!body) {
    return NextResponse.json({ response: 'Invalid JSON body' }, { status: 400 });
  }
  if ((body.id !== undefined && (!isObjectId(body.id)
      || !new ObjectId(body.id).equals(new ObjectId(expIdToStart))))
      || (body.key !== undefined && typeof body.key !== 'string')) {
    return NextResponse.json({ response: 'Invalid arguments' }, { status: 400 });
  }

  try {
    let userId: string | undefined;
    if ('token' in body) {
      if (!isNonEmptyString(body.token)) {
        return NextResponse.json({ response: 'Invalid token' }, { status: 400 });
      }
      // Starting an experiment must not provision a new account.
      const cliAuth = await authenticateCli(body.token, false);
      if (!cliAuth.user) return cliAuth.response;
      userId = cliAuth.user._id;
    } else {
      const session = await auth();
      userId = session?.user?.id;
    }
    if (!userId) {
      return NextResponse.json({ response: 'User is not authenticated' }, { status: 401 });
    }

    const client = await clientPromise;
    const experiment = await client.db(DB_NAME).collection(COLLECTION_EXPERIMENTS).findOne({
      _id: new ObjectId(expIdToStart), creator: userId,
    });
    if (!experiment) {
      return NextResponse.json({ response: 'Experiment not found' }, { status: 404 });
    }

    const url = `http://glados-service-backend:${BACKEND_PORT}/experiment`;
    const backendResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await backendAuthHeaders()),
      },
      body: JSON.stringify({ experiment: { id: new ObjectId(expIdToStart).toHexString(), key: body.key } }),
    });

    if (!backendResponse.ok) {
      throw new Error(`Fetch failed: ${backendResponse.status}`);
    }
    
    return NextResponse.json({ response: 'Experiment start requested' });
  } catch (error) {
    console.warn('Error contacting server: ', error);
    return NextResponse.json(
      { response: 'Could not reach the server to request start of the experiment' },
      { status: 500 }
    );
  }
}
