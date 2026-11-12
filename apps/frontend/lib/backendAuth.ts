import { readFile } from 'fs/promises';

// Kubernetes mounts a short-lived ServiceAccount token here (see the frontend deployment yaml).
// Its audience is the backend, so it cannot be used against the Kubernetes API.
const BACKEND_TOKEN_PATH = process.env.BACKEND_TOKEN_PATH || '/var/run/secrets/glados/backend/token';

/**
 * Headers that prove to the backend that a request comes from the frontend.
 * The token file is re-read on every call because Kubernetes rotates it.
 */
export async function backendAuthHeaders(): Promise<Record<string, string>> {
    try {
        const token = (await readFile(BACKEND_TOKEN_PATH, 'utf8')).trim();
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (error) {
        // Without the token the backend answers 401, which the callers already treat as a failure
        console.warn('Could not read the backend auth token: ', error);
        return {};
    }
}
