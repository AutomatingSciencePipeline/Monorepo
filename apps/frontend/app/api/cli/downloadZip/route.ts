import { NextRequest } from 'next/server';
import { fetchProjectZipCLI } from '../../../../lib/mongodb_funcs';
import { tokenBasedAuth } from '../../../../tokenAuth';
import { MongoExpiredSessionError } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

    const experiment_req = await req.json();

    if (!experiment_req || !experiment_req["expID"] || !experiment_req["token"]){
        return new Response('Other', { status: 400 });
    }

    const user = await tokenBasedAuth(experiment_req ["token"]);
    const userData = await user.json();
    const uid = userData["_id"];
    const expID = experiment_req["expID"];

    const result = await fetchProjectZipCLI(expID, uid);
    if (result === null) {
        return new Response('Zip not found', { status: 404 });
	}

    const { contents, name } = result;

    if (contents === null) {
        return new Response('Empty zip contents', { status: 500 });
    }

    const byteArray = Buffer.from(contents, "base64");

    return new Response(
    new Uint8Array(byteArray), 
    {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${name}.zip"`,
            'Content-Length': byteArray.byteLength.toString(),
        },
    }
);

}