import clientPromise from './lib/mongodb';
import { NextResponse } from "next/server";

export async function tokenBasedAuth(token: string) {

    const client = await clientPromise;
    const db = client.db("gladosdb");

    const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${token}` }
    });
    const emails = await emailResponse.json();
    const primaryEmail = emails.find(e => e.primary)?.email;
    let user;
    try{
        user = await db.collection("users").findOne({ email: primaryEmail });
    } catch (error) {
        return NextResponse.json({ "response": 'Missing User' }, { status: 404 });
    }

    return NextResponse.json(user); 

}