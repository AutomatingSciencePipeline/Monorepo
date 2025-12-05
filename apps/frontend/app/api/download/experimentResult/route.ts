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
    const result = await fetchResultsFileCLI(experiment_req ["expID"], uid);

    console.log(result);

    console.log("Right here");

    if("success" in result ) {
      console.log("In success result");
      const status = result.status;
      return new Response(status);
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