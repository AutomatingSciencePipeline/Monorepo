import clientPromise, { DB_NAME, COLLECTION_RESULTS_CSVS, COLLECTION_EXPERIMENT_FILES } from '../../../lib/mongodb';
import { NextApiHandler, NextApiRequest } from 'next';
import { GridFSBucket } from 'mongodb';
import { Readable, Writable } from 'stream';
import formidable, { Fields, Files } from "formidable";
import fs from "fs";

export const config = {
    api: {
        bodyParser: false
    },
}

// Helper function to parse form data with formidable
const parseForm = async (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> =>
    new Promise((resolve, reject) => {
        const form = formidable({ keepExtensions: true });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            resolve({ fields, files });
        });
    });


const mongoFileUploader: NextApiHandler<string> = async (req, res) => {
    if (req.method === 'POST') {
        const { fields, files } = await parseForm(req);
        const expId = Array.isArray(fields.id) ? fields.id[0] : fields.id;

        if (!files.file || !expId) {
            return res.status(400).json({ response: "Not enough arguments!" } as any);
        }

        try {
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

            const file = Array.isArray(files.file) ? files.file[0] : files.file;
            const fileStream = fs.createReadStream(file.filepath);

            // Upload the file to GridFS
            const uploadStream = bucket.openUploadStream(file.originalFilename || "uploadedFile", {
                metadata: { expId: expId },
            }) as Writable;


            // Pipe the file stream to GridFS
            fileStream.pipe(uploadStream).on("finish", () => {
                res.status(200).json({ message: "File and ID uploaded successfully." } as any);
            });
            return;
        }
        catch (error) {
            const message = "Failed to upload experiment file!";
            console.error("Error writing experiment file.");
            res.status(500).json({ response: message } as any);
        }
    }
}

export default mongoFileUploader;
