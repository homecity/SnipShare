import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminPassword } from '@/lib/admin-auth';
import { getD1Db } from '@/lib/d1';
import { rateLimits, blockedIps } from '@/lib/schema';
import { gte, sql, eq, desc } from 'drizzle-orm';

// Get security data
export async function GET(request: NextRequest) {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getD1Db();
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'overview';

    if (section === 'ip-activity') {
      // IP activity in last 24h
      const ipActivity = await db
        .select({
          ip: rateLimits.ip,
          action: rateLimits.action,
          count: sql<number>`count(*)`,
          lastActivity: sql<number>`max(${rateLimits.timestamp})`,
        })
        .from(rateLimits)
        .where(gte(rateLimits.timestamp, last24h))
        .groupBy(rateLimits.ip, rateLimits.action)
        .orderBy(desc(sql`count(*)`));

      return NextResponse.json({ ipActivity });
    }

    if (section === 'blocked') {
      // Get blocked IPs
      try {
        const blocked = await db
          .select()
          .from(blockedIps)
          .orderBy(desc(blockedIps.blocked_at));
        return NextResponse.json({ blockedIps: blocked });
      } catch {
        // Table might not exist yet
        return NextResponse.json({ blockedIps: [] });
      }
    }

    if (section === 'rate-log') {
      // Rate limit log (last 24h)
      const logs = await db
        .select()
        .from(rateLimits)
        .where(gte(rateLimits.timestamp, last24h))
        .orderBy(desc(rateLimits.timestamp))
        .limit(100);

      return NextResponse.json({ rateLimitLogs: logs });
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  } catch (error) {
    console.error('Admin security error:', error);
    return NextResponse.json({ error: 'Failed to fetch security data' }, { status: 500 });
  }
}

// Block/unblock IP
export async function POST(request: NextRequest) {
  try {
    const adminPassword = await getAdminPassword();
    const isAuth = await isAdminAuthenticated(adminPassword);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ip, reason } = await request.json() as {
      action: 'block' | 'unblock';
      ip: string;
      reason?: string;
    };

    if (!ip) {
      return NextResponse.json({ error: 'IP required' }, { status: 400 });
    }

    const db = await getD1Db();

    if (action === 'block') {
      try {
        await db.insert(blockedIps).values({
          ip,
          reason: reason || null,
          blocked_at: Math.floor(Date.now() / 1000),
          blocked_by: 'admin',
        });
      } catch {
        // May already be blocked
        return NextResponse.json({ error: 'IP may already be blocked' }, { status: 409 });
      }
    } else if (action === 'unblock') {
      await db.delete(blockedIps).where(eq(blockedIps.ip, ip));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin security action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
