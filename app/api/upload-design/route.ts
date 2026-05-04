import { createHash } from 'node:crypto';

// Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in env.
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [
      !cloudName && 'CLOUDINARY_CLOUD_NAME',
      !apiKey && 'CLOUDINARY_API_KEY',
      !apiSecret && 'CLOUDINARY_API_SECRET',
    ].filter(Boolean).join(', ');
    console.error('[upload-design] Missing env vars:', missing);
    return Response.json({ success: false, error: `Missing Cloudinary env vars: ${missing}` }, { status: 500 });
  }

  let image: string;
  try {
    const body = await request.json();
    image = body.image;
    if (!image || !image.startsWith('data:image/')) {
      console.error('[upload-design] Invalid or missing image field in request body');
      return Response.json({ success: false, error: 'Invalid image data' }, { status: 400 });
    }
  } catch {
    console.error('[upload-design] Failed to parse request body');
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'monkebab';

    // Cloudinary signed upload: SHA-1 of alphabetically sorted params + api_secret
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    const form = new FormData();
    form.append('file', image); // Cloudinary accepts base64 data URIs directly
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);

    console.log('[upload-design] Uploading to Cloudinary, cloud:', cloudName, 'folder:', folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: form }
    );
    const data = await res.json();

    if (!res.ok) {
      console.error('[upload-design] Cloudinary error:', data);
      return Response.json({ success: false, error: data.error?.message ?? 'Cloudinary upload failed' }, { status: 500 });
    }

    console.log('[upload-design] Upload successful:', data.secure_url);
    return Response.json({ success: true, url: data.secure_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('[upload-design] Unexpected error:', message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
