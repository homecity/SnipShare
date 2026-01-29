import { cookies } from 'next/headers';

const ADMIN_COOKIE_NAME = 'snipshare_admin_token';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Generate a simple HMAC-based token
async function generateToken(password: string, timestamp: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}:${timestamp}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${timestamp}:${hashHex}`;
}

// Verify the admin password and set cookie
export async function loginAdmin(password: string, adminPassword: string): Promise<boolean> {
  if (password !== adminPassword) return false;

  const timestamp = Date.now();
  const token = await generateToken(adminPassword, timestamp);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY_MS / 1000,
    path: '/',
  });

  return true;
}

// Check if current request is authenticated
export async function isAdminAuthenticated(adminPassword: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return false;

    const [timestampStr, hash] = token.split(':');
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Check expiry
    if (Date.now() - timestamp > TOKEN_EXPIRY_MS) return false;

    // Verify token
    const expectedToken = await generateToken(adminPassword, timestamp);
    return expectedToken === token;
  } catch {
    return false;
  }
}

// Logout
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

// Get admin password from environment
export async function getAdminPassword(): Promise<string> {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  try {
    const { env } = await getCloudflareContext();
    const password = (env as unknown as Record<string, string>).ADMIN_PASSWORD;
    return password || '';
  } catch {
    return process.env.ADMIN_PASSWORD || '';
  }
}
