import { servePublicMediaSubpath } from '../../../../../lib/public-media-serve';

export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path: pathSegments } = await context.params;
  return servePublicMediaSubpath(request, 'media/gallery', pathSegments, 'media/gallery');
}
