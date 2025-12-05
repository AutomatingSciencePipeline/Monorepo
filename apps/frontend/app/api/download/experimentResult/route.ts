import clientPromise, { COLLECTION_EXPERIMENTS, DB_NAME } from '../../../../lib/mongodb';
import { NextRequest } from 'next/server';
import { fetchResultsFileCLI } from '../../../../lib/mongodb_funcs';
import { tokenBasedAuth } from '../../../../tokenAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const experiment_req = await req.json();

    if (!experiment_req || !experiment_req ["expID"] || !experiment_req ["token"]){
        return new Response('Other', { status: 400 });
    }

    const user = await tokenBasedAuth(experiment_req ["token"]);
    const userData = await user.json();
    const uid = userData["_id"];

    // const client = await clientPromise;
    // const db = client.db(DB_NAME);
    // const experimentsCollection = db.collection(COLLECTION_EXPERIMENTS);

    // const sendAllRelevantDocs = async () => {
    //     const docs = await experimentsCollection
    //         .find({ $and: [ { creator: uid }, {_id: experiment_req ["expID"]}]})
    //         .toArray();
    //     return docs;
    // };
    
    // try{
    //     const result = await sendAllRelevantDocs();
    //     if(!result){
            
    //     }
    // } catch (error){

    // }
    console.log(experiment_req ["expID"]);
    const result = await fetchResultsFileCLI(experiment_req ["expID"], uid);
    if (result === null) {
		//Add result warning
        console.log("Result ended up being Null :)")
        return;
	}

	const { contents, name } = result;
    console.log(contents);
	return new Response(contents, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}