import { decodeFragment } from '../../../packages/tokens/src/theme/codec.ts';
import { toRegistryItem } from '../../../packages/tokens/src/theme/export.ts';
import { REGISTRY_DRAFT_MAX_BYTES, REGISTRY_URL_MAX_LENGTH } from '../../../packages/tokens/src/theme/registry-url.ts';

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export async function themeRegistry(request: Request): Promise<Response> {
  const respond = (status: number, body: string, headers: Record<string, string> = {}) => new Response(request.method === 'HEAD' ? null : body, { status, headers: { ...HEADERS, ...headers } });
  const error = (status: number, message: string) => respond(status, JSON.stringify({ error: message }));
  if (request.method !== 'GET' && request.method !== 'HEAD') return respond(405, JSON.stringify({ error: 'Use GET to fetch a theme.' }), { allow: 'GET, HEAD' });
  if (request.url.length > REGISTRY_URL_MAX_LENGTH) return error(414, 'This theme is too large for an install URL. Use the registry download.');
  const url = new URL(request.url);
  const values = url.searchParams.getAll('theme');
  const encoded = values[0];
  if (values.length !== 1 || !encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) return error(400, 'Provide one encoded theme in the theme query parameter.');
  const decoded = await decodeFragment(`#theme=${encoded}`, { maxBytes: REGISTRY_DRAFT_MAX_BYTES });
  if (!decoded.ok) return error(400, decoded.message);
  return respond(200, toRegistryItem(decoded.draft));
}
