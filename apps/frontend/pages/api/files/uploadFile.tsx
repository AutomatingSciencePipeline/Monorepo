import clientPromise, { DB_NAME, COLLECTION_RESULTS_CSVS, COLLECTION_EXPERIMENT_FILES } from '../../../lib/mongodb';
import { NextApiHandler } from 'next';
import { ResultsCsv } from '../../../lib/mongodb_types';

const mongoFileUploader: NextApiHandler<string> = async (req, res) => {
    const { fileToUpload } = req.query;
    if (typeof fileToUpload !== 'string'){
        res.status(400).json({response: 'File is not in the correct format'} as any);
        return;
    } 

    try{
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        // Create the doc we want to write
        const doc = {"file": Buffer.from(fileToUpload, 'base64')};
        const newDoc = await db.collection(COLLECTION_EXPERIMENT_FILES).insertOne(doc);

        res.status(200).json({response: `Successfully wrote file to document ${newDoc.insertedId}`} as any);
        return;
    }
    catch (error){
        const message = "Failed to upload experiment file!";
        console.error("Error writing experiment file.");
        res.status(500).json({ response: message } as any);
    }
}


export default mongoFileUploader;
