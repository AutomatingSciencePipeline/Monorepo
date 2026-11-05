import { NextRequest, NextResponse } from 'next/server';
import { fetchProjectZipCLI } from '../../../../lib/mongodb_funcs';
import { authenticateCli, invalidArguments, isNonEmptyString, isObjectId, readJsonObject } from '../request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

    const experiment_req = await readJsonObject(req);

    if (!experiment_req || !isObjectId(experiment_req.expID) || !isNonEmptyString(experiment_req.token)) {
        return invalidArguments();
    }

    const auth = await authenticateCli(experiment_req.token);
    if (!auth.user) return auth.response;
    try {
        const result = await fetchProjectZipCLI(experiment_req.expID, auth.user._id);
        if (result === null) {
            return new Response('not_found', { status: 404 });
        }

        const { contents, name } = result;

        if (contents === null) {
            return new Response('Empty zip contents', { status: 500 });
        }

        const byteArray = Buffer.from(contents, 'base64');

        return new Response(new Uint8Array(byteArray), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${name}.zip"`,
                'Content-Length': byteArray.byteLength.toString(),
            },
        });
    } catch {
        return NextResponse.json({ error: 'Other' }, { status: 500 });
    }

}
