import { NextResponse } from 'next/server';
import { tokenBasedAuth } from '../../../tokenAuth';

type CliUser = { _id: string; [key: string]: any };

export async function readJsonObject(req: Request): Promise<Record<string, unknown> | null> {
    try {
        const value: unknown = await req.json();
        return value !== null && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

export function isObjectId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

export function invalidArguments(): Response {
    return NextResponse.json({ error: 'Other' }, { status: 400 });
}

export async function authenticateCli(token: string): Promise<
    { user: CliUser; response: null } | { user: null; response: Response }
> {
    try {
        const response = await tokenBasedAuth(token);
        if (response.ok) {
            const user: unknown = await response.json();
            if (user !== null && typeof user === 'object' && !Array.isArray(user)
                && isObjectId((user as CliUser)._id)
                && !(user as Record<string, unknown>).response) {
                return { user: user as CliUser, response: null };
            }
        }
    } catch {
        // Authentication must finish successfully before any experiment or file access.
    }
    return {
        user: null,
        response: NextResponse.json({
            success: false,
            error: 'auth_error',
            message: 'Authentication failed',
        }, { status: 401 }),
    };
}
