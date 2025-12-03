import { submitExperimentCLI } from '../../../../lib/mongodb_funcs';
import { tokenBasedAuth } from "../../../../tokenAuth";
import clientPromise, { DB_NAME } from "../../../../lib/mongodb";
import { GridFSBucket } from "mongodb";
import * as yaml from "js-yaml";
import { NextResponse } from "next/server";
import { useForm, joiResolver } from '@mantine/form';
import { experimentSchema } from '../../../../utils/validators';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const formVals = await req.formData();

  const userToken = formVals.get("userToken");
  const execFile = formVals.get("execFileID") as string;
  const file = formVals.get("file") as File | null;

  if (!userToken || !file) {
    return NextResponse.json({ response: 'Not enough arguments!' }, { status: 400 });
  }

  try {
    const resp = await tokenBasedAuth(String(userToken));
    const user = await resp.json();
    // console.log(user);
    const userId = user["_id"];
    const email = user['email'];
    const role = user['role'];
    const yamlText = await file.text();
    // console.log("This is exec file id");
    // console.log(execFile);

    let parsed: any;
    try {
        parsed = yaml.load(yamlText);
        if (!parsed || typeof parsed !== "object") {
        throw new Error("YAML did not produce an object");
        }
    } catch (err: any) {
        return NextResponse.json({ error: "Invalid YAML: " + err.message }, { status: 400 });
    }

    parsed["file"] = execFile;
    parsed["experimentExecutable"] = "";

    console.log(parsed)

    // if (error) {
    //     return NextResponse.json(
    //     { error: "Validation failed", details: error.details },
    //     { status: 400 }
    //   );
    // }

    const expId = await submitExperimentCLI(parsed, userId, email, role, execFile);

    return NextResponse.json({
      success: true,
      expId: expId,
    });

  } catch (error) {
    console.error('Error submitting experiment.', error);
    return NextResponse.json({ response: 'Failed to submit experiment!' }, { status: 500 });
  }
}
