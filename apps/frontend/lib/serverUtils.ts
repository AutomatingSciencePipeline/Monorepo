import 'server-only';

export function isObjectId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

export function formatTimestamp(timestamp: string | number): string {
    // Preserve the UTC-5 filename convention while handling date and year rollover.
    const date = new Date(new Date(timestamp).getTime() - 5 * 60 * 60 * 1000);
    return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace(/Z$/, '');
}

export function formatFilename(name: string, timestamp: string | number, extension: string): string {
    const formattedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${formattedName}_${formatTimestamp(timestamp)}.${extension}`;
}
