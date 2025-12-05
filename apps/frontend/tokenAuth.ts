import clientPromise from './lib/mongodb';
import { NextResponse } from "next/server";

export async function tokenBasedAuth(token: string) {

    const client = await clientPromise;
    const db = client.db("gladosdb");

    let user;
    try{
        const userResponse = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const login = await userResponse.json();
        const account = await db.collection("accounts").findOne(
        {providerAccountId: login["id"].toString(), provider: "github" },
        );

         if (account ){
            //If account exists, return user
            user = await db.collection("users").findOne({ _id: account.userId });
        } else {
        //If account does not exist, add entry to users and then accounts collections
            let submission = await db.collection("users").insertOne({  name:  login["login"],
                                            email: login["email"],
                                            image: login["avatar_url"], 
                                            role: "user" });
            let account = await db.collection("accounts").insertOne({ 
                                            _id: login["id"],
                                            userId: submission["insertedId"],
                                            type: "oauth",
                                            provider: "github",
                                            providerAccountId: login["id"].toString(),
                                            access_token: login["access_token"],
                                            token_type: "bearer"});  
            user = submission;                             
    }
    } catch (error) {
        return NextResponse.json({ "response": 'Missing User' }, { status: 404 });
    }
    return NextResponse.json(user); 

}