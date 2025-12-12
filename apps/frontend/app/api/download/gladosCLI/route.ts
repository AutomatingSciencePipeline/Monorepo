import { NextRequest } from 'next/server';
import { promises as fs} from 'fs';

export async function GET(request: NextRequest) {
    let contents = await fs.readFile('./cli/glados_cli.py', 'utf-8');
    return new Response(contents, {
        headers: {
            "Content-Type": "text/python; charset=utf-8",
            "Content-Disposition": `attachment; filename="glados_cli.py"`,
            "Cache-Control": "no-store",
        }
    });
}