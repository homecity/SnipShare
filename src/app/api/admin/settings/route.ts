import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminPassword } from '@/lib/admin-auth';
import { getD1Db } from '@/lib/d1';
import { getSettings, updateSetting } from '@/lib/db';

export async function GET() {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getD1Db();
    const current = await getSettings(db);

    return NextResponse.json(current);
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

const VALID_KEYS = new Set([
  'rate_limit_per_minute',
  'rate_limit_per_hour',
  'rate_limit_per_day',
  'max_file_size_mb',
  'allowed_file_types',
]);

export async function PUT(request: NextRequest) {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as Record<string, string | number>;
    const db = await getD1Db();

    const updated: string[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (!VALID_KEYS.has(key)) continue;

      // Validate numeric settings
      if (key !== 'allowed_file_types') {
        const num = Number(value);
        if (isNaN(num) || num < 1) {
          return NextResponse.json(
            { error: `Invalid value for ${key}: must be a positive number` },
            { status: 400 }
          );
        }
        // Sensible bounds
        if (key === 'max_file_size_mb' && num > 100) {
          return NextResponse.json(
            { error: 'Max file size cannot exceed 100 MB' },
            { status: 400 }
          );
        }
        if (key.startsWith('rate_limit') && num > 10000) {
          return NextResponse.json(
            { error: 'Rate limit cannot exceed 10,000' },
            { status: 400 }
          );
        }
      } else {
        // Validate allowed_file_types format
        const types = String(value);
        if (!types.trim()) {
          return NextResponse.json(
            { error: 'Allowed file types cannot be empty' },
            { status: 400 }
          );
        }
        // Each entry should start with a dot
        const parts = types.split(',').map(s => s.trim());
        for (const part of parts) {
          if (!part.startsWith('.') || part.length < 2) {
            return NextResponse.json(
              { error: `Invalid file extension: "${part}". Must start with a dot.` },
              { status: 400 }
            );
          }
        }
      }

      await updateSetting(db, key, String(value));
      updated.push(key);
    }

    if (updated.length === 0) {
      return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 });
    }

    const current = await getSettings(db);
    return NextResponse.json({ success: true, updated, settings: current });
  } catch (error) {
    console.error('Admin settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
