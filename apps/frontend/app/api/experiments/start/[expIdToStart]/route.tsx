// app/api/start/[expIdToStart]/route.ts

import { getEnvVar } from '../../../../../utils/env';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_PORT = 5050;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ expIdToStart: string }> }
) {
  const { expIdToStart } = await params;

  if (!expIdToStart || typeof expIdToStart !== 'string') {
    return NextResponse.json({ response: 'Missing experiment ID' }, { status: 400 });
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
