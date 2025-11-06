import clientPromise from '../../../../../lib/mongodb';
import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { tokenBasedAuth } from '../../../../../tokenAuth';

export async function POST(req: NextRequest) {

    const experiment_req = await req.json();

    if (!experiment_req || !experiment_req ["token"]){
        return NextResponse.json({error: 'Other', status: 400 });
    }

    const user = await tokenBasedAuth(experiment_req["token"]);

    return NextResponse.json(user); 

}