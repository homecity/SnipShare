import { NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminPassword } from '@/lib/admin-auth';

export async function GET() {
  try {
    const adminPassword = await getAdminPassword();
    if (!adminPassword) {
      return NextResponse.json({ authenticated: false, error: 'Not configured' });
    }
    const isAuth = await isAdminAuthenticated(adminPassword);
    return NextResponse.json({ authenticated: isAuth });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
