import clientPromise, { DB_NAME, COLLECTION_EXPERIMENTS } from '../../../../lib/mongodb';
import { ExperimentData } from '../../../../lib/db_types';
import { ObjectId } from 'mongodb';
import { authenticateCli, invalidArguments, isNonEmptyString, isObjectId } from '../request';
import * as yaml from "js-yaml";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let formVals: FormData;
  try {
    formVals = await req.formData();
  } catch {
    return invalidArguments();
  }

  const userToken = formVals.get("userToken");
  const fileId = formVals.get("execFileID");
  const file = formVals.get("file");

  if (!isNonEmptyString(userToken) || !isObjectId(fileId)
      || !file || typeof file !== 'object' || typeof file.text !== 'function') {
    return invalidArguments();
  }

  // An executable owner must already have an account from login or upload.
  const auth = await authenticateCli(userToken, false);
  if (!auth.user) return auth.response;

  try {
    const user = auth.user;
    const userId = user["_id"];
    const email = typeof user['email'] === 'string' ? user['email'] : '';
    const role = user['role'] === 'admin' || user['role'] === 'privileged' ? user['role'] : 'user';
    const yamlText = await file.text();

    let parsed: any;
    try {
        parsed = yaml.load(yamlText);
        if (Object.prototype.toString.call(parsed) !== '[object Object]') {
        throw new Error("YAML did not produce a mapping");
        }
    } catch {
        return NextResponse.json({ error: 'Invalid YAML' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const executable = await db.collection('fileBucket.files').findOne({
      _id: new ObjectId(fileId), 'metadata.userId': userId,
    });
    if (!executable) {
      return NextResponse.json({ response: 'File not found' }, { status: 404 });
    }

    const expId = await submitExperimentCLI(parsed, userId, email, role, new ObjectId(fileId).toHexString());

    return NextResponse.json({
      success: true,
      expId: expId,
    });

  } catch (error) {
    return NextResponse.json({ response: 'Failed to submit experiment!' }, { status: 500 });
  }
}

async function submitExperimentCLI(values: Partial<ExperimentData>, userId: string, userEmail: string, role: string, fileId: string) {
    const expData = {
        ...values,
        creator: userId,
        creatorEmail: userEmail,
        creatorRole: role,
        created: Date.now(),
        finished: false,
        estimatedTotalTimeMinutes: 0,
        totalExperimentRuns: 0,
        file: fileId,
        trialResultLineNumber: Number(values.trialResultLineNumber || 1),
        sharedUsers: [],
        status: 'CREATED',
        passes: 0,
        fails: 0,
    };
    delete (expData as typeof expData & { _id?: unknown })._id;
    delete expData.expId;
    delete expData.startedAtEpochMillis;
    delete expData.finishedAtEpochMilliseconds;
    delete expData.expToRun;
    delete (expData as typeof expData & { finishedAtEpochMillis?: unknown }).finishedAtEpochMillis;

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTION_EXPERIMENTS).insertOne(expData);
    if (result) {
        return result.insertedId.toString();
    }
    return Promise.reject(`Failed to insert experiment data`);
}
