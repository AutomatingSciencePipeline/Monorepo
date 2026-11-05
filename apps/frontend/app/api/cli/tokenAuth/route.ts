import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { authenticateCli, invalidArguments, isNonEmptyString, readJsonObject } from '../request';

export async function POST(req: NextRequest) {

    const experiment_req = await readJsonObject(req);

    if (!experiment_req || !isNonEmptyString(experiment_req.token)) {
        return invalidArguments();
    }

    const auth = await authenticateCli(experiment_req.token);
    if (!auth.user) return auth.response;
    return NextResponse.json(auth.user);

}
