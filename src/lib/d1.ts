import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from './db';

export async function getD1Db() {
  const { env } = await getCloudflareContext();
  return getDb(env as unknown as { DB: D1Database });
}

export async function getR2Bucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext();
  return (env as unknown as { FILES: R2Bucket }).FILES;
}

export async function getEnv() {
  const { env } = await getCloudflareContext();
  return env as unknown as { DB: D1Database; FILES: R2Bucket };
}
