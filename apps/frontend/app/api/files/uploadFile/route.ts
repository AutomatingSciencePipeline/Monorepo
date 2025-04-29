import clientPromise, { DB_NAME } from '../../../../lib/mongodb';
import { GridFSBucket } from 'mongodb';
import formidable, { Fields, Files } from 'formidable';
import { Readable } from 'stream';
import { ReadableStream as WebReadableStream } from 'web-streams-polyfill/ponyfill'; // for web Response body
import { IncomingMessage } from 'http';
import fs from "fs";
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { fields, files } = await parseForm(req);

  const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;

  if (!files.file || !userId) {
    return NextResponse.json({ response: 'Not enough arguments!' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    const identicalFileCursor = bucket.find({
      'metadata.hash': file.hash,
      'metadata.userId': userId,
    });
    const identicalFileArray = await identicalFileCursor.toArray();

    if (identicalFileArray.length > 0) {
      const fileId = identicalFileArray[0]._id;
      const fileName = identicalFileArray[0].filename;
      return Response.json({
        message: 'Reusing file in database!',
        fileId,
        fileName,
        reuse: true,
      });
    }

    const fileStream = fs.createReadStream(file.filepath);

    const uploadStream = bucket.openUploadStream(file.originalFilename || 'uploadedFile', {
      metadata: { userId: userId, hash: file.hash, lastUsedDate: new Date() },
    });

    // Pipe file stream into MongoDB
    await new Promise<void>((resolve, reject) => {
      fileStream.pipe(uploadStream)
        .on('finish', () => resolve())
        .on('error', (err) => reject(err));
    });

    return Response.json({
      message: 'File and ID uploaded successfully.',
      fileId: uploadStream.id,
      fileName: uploadStream.filename,
    });

  } catch (error) {
    console.error('Error writing experiment file.', error);
    return Response.json({ response: 'Failed to upload experiment file!' }, { status: 500 });
  }
}

async function parseForm(req: Request): Promise<{ fields: Fields; files: Files }> {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
      throw new Error('Invalid Content-Type');
    }
  
    const form = formidable({ keepExtensions: true, hashAlgorithm: 'sha256' });
  
    const bodyBuffer = Buffer.from(await req.arrayBuffer());
    const stream = Readable.from(bodyBuffer) as unknown as IncomingMessage;
  
    // Now manually set needed fields so Formidable is happy
    stream.headers = Object.fromEntries(req.headers.entries());
    stream.method = req.method || 'POST';
    stream.url = '';
  
    return new Promise((resolve, reject) => {
      form.parse(stream, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });
  }