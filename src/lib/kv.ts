import { kv } from "@vercel/kv";

const KEY = "whitelist";

export async function isWhitelisted(handle: string): Promise<boolean> {
  const result = await kv.sismember(KEY, handle.toLowerCase());
  return result === 1;
}

export async function getWhitelist(): Promise<string[]> {
  const members = await kv.smembers(KEY);
  return (members as string[]).sort();
}

export async function addToWhitelist(handle: string): Promise<void> {
  await kv.sadd(KEY, handle.toLowerCase());
}

export async function removeFromWhitelist(handle: string): Promise<void> {
  await kv.srem(KEY, handle.toLowerCase());
}
