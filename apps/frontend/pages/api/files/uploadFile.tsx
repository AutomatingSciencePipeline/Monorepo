import clientPromise, { DB_NAME, COLLECTION_RESULTS_CSVS, COLLECTION_EXPERIMENT_FILES } from '../../../lib/mongodb';
import { NextApiHandler, NextApiRequest } from 'next';
import { GridFSBucket } from 'mongodb';
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
        const form = formidable({ keepExtensions: true, hashAlgorithm: "sha256" });
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            resolve({ fields, files });
        });
    });


const mongoFileUploader: NextApiHandler<string> = async (req, res) => {
    if (req.method === 'POST') {
        const { fields, files } = await parseForm(req);
        const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;

        if (!files.file || !userId) {
            return res.status(400).json({ response: "Not enough arguments!" } as any);
        }

        try {
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const bucket = new GridFSBucket(db, { bucketName: 'fileBucket' });

            const file = Array.isArray(files.file) ? files.file[0] : files.file;
            //Try to find that file hash in the database
            const identicalFile = bucket.find({ "metadata.hash": file.hash, "metadata.userId": userId });
            const identicalFileArray = await identicalFile.toArray();
            if(identicalFileArray.length > 0){
                const fileId = identicalFileArray[0]._id;
                const fileName = identicalFileArray[0].filename;
                res.status(200).json({message: "Reusing file in database!", fileId: fileId, fileName: fileName, reuse: true} as any);
                return;
            }

            const fileStream = fs.createReadStream(file.filepath);

            // Upload the file to GridFS
            const uploadStream = bucket.openUploadStream(file.originalFilename || "uploadedFile", {
                metadata: { userId: userId, hash: file.hash, lastUsedDate: new Date()},
            });


            // Pipe the file stream to GridFS
            fileStream.pipe(uploadStream).on("finish", () => {
                res.status(200).json({ message: "File and ID uploaded successfully.", fileId: uploadStream.id, fileName: uploadStream.filename } as any);
            });

            return;
        }
        catch (error) {
            const message = "Failed to upload experiment file!";
            console.error("Error writing experiment file.");
            console.log(error);
            res.status(500).json({ response: message } as any);
        }
    }
}

export default mongoFileUploader;
