import { tokenBasedAuth } from "../../../../tokenAuth";
import clientPromise, { DB_NAME } from "../../../../lib/mongodb";
import { GridFSBucket } from "mongodb";
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();

  const userToken = form.get("userToken");
  const file = form.get("file") as File | null;

  if (!userToken || !file) {
    return NextResponse.json({ response: 'Not enough arguments!' }, { status: 400 });
  }

  const user = await tokenBasedAuth(String(userToken));
  const userId = user["id"];
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: "fileBucket" });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uint8 = new Uint8Array(arrayBuffer);
    const hash = crypto.createHash("sha256").update(uint8).digest("hex");

    const identicalFileCursor = bucket.find({
      'metadata.hash': hash,
      'metadata.userId': userId,
    });
    const identicalFileArray = await identicalFileCursor.toArray();

    if (identicalFileArray.length > 0) {
      const fileId = identicalFileArray[0]._id;
      const fileName = identicalFileArray[0].filename;
      return NextResponse.json({
        message: 'Reusing file in database!',
        fileId,
        fileName,
        reuse: true,
      });
    }

    const uploadStream = bucket.openUploadStream(file.name || 'uploadedFile', {
      metadata: { userId: userId, hash: hash, lastUsedDate: new Date() },
    });
    uploadStream.end(buffer);

    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);
    });

    return NextResponse.json({
      message: "File uploaded successfully",
      fileId: uploadStream.id,
      fileName: uploadStream.filename,
    });
  } catch (error) {
    console.error('Error writing experiment file.', error);
    return NextResponse.json({ response: 'Failed to upload experiment file!' }, { status: 500 });
  }
}
