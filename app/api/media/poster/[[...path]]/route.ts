import { servePublicMediaSubpath } from '../../../../../lib/public-media-serve';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path: pathSegments } = await context.params;
  return servePublicMediaSubpath('media/poster', pathSegments, 'media/poster');
}
