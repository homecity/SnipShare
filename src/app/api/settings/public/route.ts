import { NextResponse } from 'next/server';
import { getD1Db } from '@/lib/d1';
import { getSettings } from '@/lib/db';

// Public endpoint: returns only file upload limits (no rate limit info)
export async function GET() {
  try {
    const db = await getD1Db();
    const cfg = await getSettings(db);

    return NextResponse.json({
      max_file_size_mb: cfg.max_file_size_mb,
      allowed_file_types: cfg.allowed_file_types,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch {
    // Fallback defaults
    return NextResponse.json({
      max_file_size_mb: 5,
      allowed_file_types: '.txt,.md,.pdf,.json,.csv,.log,.xml,.yaml,.yml,.html,.css,.js,.ts,.py,.sh,.sql,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip',
    });
  }
}
