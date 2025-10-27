import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import clientPromise, { DB_NAME } from '../../../../../lib/mongodb';
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try{
    const login = await req.json();
    console.log("id: ", login["id"]);
    const client = await clientPromise;
    const db = client.db("gladosdb")

    const account = await db.collection("accounts").findOne({
        $or: [
        { providerAccountId: login["id"].toString(), provider: "github" },
        { providerAccountId: login["id"].toString(), provider: "google" },
        { email: login["email"] }
    ]
    });

    let user;
    if (account ){
        user = await db.collection("users").findOne({ _id: account.userId });
    }else{
        user = {
            "auth": "Wrong"
        }
    }

    return NextResponse.json({user})
    } catch (err) {
        console.error("Wrong!");
    }
    

}