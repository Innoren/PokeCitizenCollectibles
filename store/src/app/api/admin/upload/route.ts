import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles image file uploads for product images.
 * Uploads to Vercel Blob storage via their REST API.
 *
 * Accepts: JPG, PNG, WebP, GIF (max 10MB)
 */

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, WebP, GIF` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 10MB` },
        { status: 400 }
      );
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: 'Blob storage not configured. Add BLOB_READ_WRITE_TOKEN to environment variables.' },
        { status: 500 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `cards/${timestamp}-${randomStr}.${ext}`;

    // Upload to Vercel Blob via REST API
    const blobResponse = await fetch(`https://blob.vercel-storage.com/${filename}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-content-type': file.type,
        'x-cache-control-max-age': '31536000',
      },
      body: file,
    });

    if (!blobResponse.ok) {
      const errText = await blobResponse.text();
      console.error('Blob upload failed:', errText);
      return NextResponse.json({ error: 'Upload to storage failed' }, { status: 500 });
    }

    const blob = await blobResponse.json();

    return NextResponse.json({ imageUrl: blob.url, filename });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
