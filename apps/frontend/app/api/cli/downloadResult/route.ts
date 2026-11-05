import { NextRequest, NextResponse } from 'next/server';
import { fetchResultsFileCLI } from '../../../../lib/mongodb_funcs';
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
        const result = await fetchResultsFileCLI(experiment_req.expID, auth.user._id);

        if ('success' in result) {
            return new Response('not_found', { status: result.status === 'not_found' ? 404 : 500 });
        }

        const { contents, name } = result;
        return new Response(contents, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${name}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch {
        return NextResponse.json({ error: 'Other' }, { status: 500 });
    }
}
