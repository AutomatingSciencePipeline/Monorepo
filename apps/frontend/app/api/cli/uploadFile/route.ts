import clientPromise, { DB_NAME } from '../../../../lib/mongodb';
import { GridFSBucket } from 'mongodb';
import formidable, { Files, Fields } from 'formidable';
import { Readable } from 'stream';
import fs from 'fs';
import { NextResponse } from 'next/server';
import { tokenBasedAuth } from "../../../../tokenAuth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let fields: Fields;
  let files: Files;

  try {
    ({ fields, files } = await parseForm(req));
  } catch (err) {
    return NextResponse.json(
      { message: "Failed to parse upload form" },
      { status: 400 }
    );
  }

  const userToken = Array.isArray(fields.userToken) ? fields.userToken[0] : fields.userToken;
  const file = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!file || !userToken) {
    return NextResponse.json(
      { message: "File or userId missing" },
      { status: 400 }
    );
  }

  try {
    const resp = await tokenBasedAuth(String(userToken));
    const user = await resp.json();
    const userId = user["_id"];
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const existing = await bucket
      .find({ 'metadata.hash': file.hash, 'metadata.userId': userId })
      .toArray();

    if (existing.length > 0) {
      const match = existing[0];
      return NextResponse.json({
        message: 'Reusing file in database!',
        fileId: match._id,
        fileName: match.filename,
        reuse: true,
      });
    }

    const fileStream = fs.createReadStream(file.filepath);

    const uploadStream = bucket.openUploadStream(
      file.originalFilename || "uploadedFile",
      {
        metadata: {
          userId,
          hash: file.hash,
          lastUsedDate: new Date(),
        },
      }
    );

    await new Promise<void>((resolve, reject) => {
      fileStream
        .pipe(uploadStream)
        .on("finish", resolve)
        .on("error", reject);
    });

    return NextResponse.json({
      message: "Upload successful",
      fileId: uploadStream.id,
      fileName: uploadStream.filename,
      reuse: false,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to upload file" },
      { status: 500 }
    );
  }
}

async function parseForm(
  req: Request
): Promise<{ fields: Fields; files: Files }> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    throw new Error("Invalid content-type");
  }

  const form = formidable({
    keepExtensions: true,
    hashAlgorithm: "sha256",
    multiples: false,
  });

  const bodyBuf = Buffer.from(await req.arrayBuffer());
  const incoming = Readable.from(bodyBuf) as any;

  incoming.headers = Object.fromEntries(req.headers.entries());
  incoming.method = "POST";
  incoming.url = "/";

  return new Promise((resolve, reject) => {
    form.parse(incoming, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
