import { NextResponse } from 'next/server';
import { checkAuditHealth } from '../../../../lib/agentAudit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reports whether the agent audit log can be written to. Mutating agent tools must be refused
// while this is unhealthy (Agentic Implementation Plan §4.2).
export async function GET() {
	const health = await checkAuditHealth();
	if (!health.healthy) {
		console.error(`Agent audit log unhealthy: ${health.reason}`);
	}
	// Failure details stay in the server log rather than being exposed to callers.
	return NextResponse.json(
		{ healthy: health.healthy, checked_at: new Date().toISOString() },
		{ status: health.healthy ? 200 : 503 },
	);
}
