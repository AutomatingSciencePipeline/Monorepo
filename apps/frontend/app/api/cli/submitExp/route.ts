import { submitExperimentForUser } from '../../../../lib/experimentSubmission';
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

    const expId = await submitExperimentForUser(parsed, user, fileId);
    if (expId === null) {
      return NextResponse.json({ response: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      expId: expId,
    });

  } catch (error) {
    return NextResponse.json({ response: 'Failed to submit experiment!' }, { status: 500 });
  }
}
