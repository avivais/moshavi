import { servePublicMediaSubpath } from '../../../../../lib/public-media-serve';

export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path: pathSegments } = await context.params;
  return servePublicMediaSubpath(request, 'media/sets', pathSegments, 'media/sets');
}
