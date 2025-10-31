import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import clientPromise, { DB_NAME } from '../../../../../lib/mongodb';
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const login = await req.json();
    const client = await clientPromise;
    const db = client.db("gladosdb");

    const account = await db.collection("accounts").findOne({
        //TODO: only GitHub should remain out of these 3 listed once merged
        //so long as we don't want risky email sharing on CLI
        $or: [
        { providerAccountId: login["id"].toString(), provider: "github" },
        { providerAccountId: login["id"].toString(), provider: "google" },
        { email: login["email"]}
    ]
    });

    let user;
    if (account ){
        //If account exists, return user
        let userId = account["userid"];
        user = await db.collection("users").findOne({ _id: userId });
    }else{
        //If account does not exist, add entry to users and then accounts collections
        let submission = await db.collection("users").insertOne({  name:  login["login"],
                                            email: login["email"],
                                            image: login["avatar_url"], 
                                            role: "user" });
        user = {_id: submission["insertedId"],
                name: login["name"],
                email:login["email"],
                image:login["avatar_url"], 
                role: "user" }
        await db.collection("accounts").insertOne({ 
                                            _id: login["id"],
                                            userid: submission["insertedId"],
                                            type: "oauth",
                                            provider: "github",
                                            providerAccountId: login["id"].toString(),
                                            access_token: login["access_token"],
                                            token_type: "bearer"});                                         
    }

    return NextResponse.json(user); 

}