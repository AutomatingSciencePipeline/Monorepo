import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import clientPromise, { DB_NAME } from '../../../../../lib/mongodb';
import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {

    const token = (await req.json())["token"];

    const response = await fetch ("https://api.github.com/user", {
        method: "GET",
        headers: {
            "Authorization":`Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "NextApp"
        }
    }
    )
    let login = await response.json();
    const client = await clientPromise;
    const db = client.db("gladosdb");

    const accountsCollection = db.collection("accounts");

  // Get one document
  const account1 = await accountsCollection.findOne();
  console.log(account1);

    const emailResponse = await fetch("https://api.github.com/user/emails", {
  headers: { Authorization: `Bearer ${token}` }
});
const emails = await emailResponse.json();
const primaryEmail = emails.find(e => e.primary)?.email;
let user;
try{
    user = await db.collection("users").findOne({ email: primaryEmail });
} catch (error) {
    return NextResponse.json({ response: 'Missing User' }, { status: 404 });
}

    // const account = await db.collection("accounts").findOne({
    //     //TODO: only GitHub should remain out of these 3 listed once merged
    //     //so long as we don't want risky email sharing on CLI
    //     $or: [
    //     { providerAccountId: login["id"].toString(), provider: "github" },
    //     { providerAccountId: login["id"].toString(), provider: "google" }
    // ]
    // });

    // let user;
    // let submission;
    // if (account ){
    //     //If account exists, return user
    //     let uid = new ObjectId(account["userId"]);
    //     user = await db.collection("users").findOne({ email: primaryEmail });
    // }else{
    //     //If account does not exist, add entry to users and then accounts collections
    //     user = {None: "None"};
    //     // if (!login.email) {
    //     //     const emails = await fetch("https://api.github.com/user/emails", {
    //     //     headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    //     // }).then(r => r.json());
    //     //     login.email = emails.find((e: any) => e.primary)?.email || null;
    //     // }

    //     // submission = await db.collection("users").insertOne({ 
    //     //         _id: submission["insertedId"],
    //     //         role: "user",
    //     //         image: login["avatar_url"], 
    //     //         email:login["email"],
    //     //         emailVerified: null});
    //     // user = {_id: submission["insertedId"],
    //     //         role: "user",
    //     //         image: login["avatar_url"], 
    //     //         email:login["email"],
    //     //         emailVerified: null
    //     //         }
    //     // await db.collection("accounts").insertOne({ 
    //     //                                     _id: login["id"],
    //     //                                     type: "oauth",
    //     //                                     providerAccountId: login["id"].toString(),
    //     //                                     provider: "github",
    //     //                                     access_token: login["access_token"],
    //     //                                     token_type: "bearer",
    //     //                                     userId: new ObjectId(submission["insertedId"])});                                         
    // }
    return NextResponse.json(user); 

}