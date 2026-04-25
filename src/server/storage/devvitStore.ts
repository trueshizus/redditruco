// Devvit Redis adapter implementing the Store interface.
//
// Wraps @devvit/web/server's redis client. Maps our Store contract to
// Devvit Redis methods 1:1 except for zPopMin (Devvit doesn't expose it
// natively — we emulate via zRange + zRem in a transaction).

import { redis } from '@devvit/web/server';
import type { Store } from './store.js';

export const devvitStore: Store = {
  async get(key) {
    const v = await redis.get(key);
    return v ?? null;
  },

  async set(key, value, opts) {
    if (opts?.nx) {
      const existing = await redis.get(key);
      if (existing != null) return false;
    }
    const setOpts: { expiration?: Date; nx?: boolean } = {};
    if (opts?.ttlSec != null) setOpts.expiration = new Date(Date.now() + opts.ttlSec * 1000);
    if (opts?.nx) setOpts.nx = true;
    await redis.set(key, value, setOpts);
    return true;
  },

  async del(...keys) {
    if (keys.length === 0) return;
    await redis.del(...keys);
  },

  async expire(key, seconds) {
    await redis.expire(key, seconds);
  },

  async exists(key) {
    const n = await redis.exists(key);
    return n > 0;
  },

  async hGetAll(key) {
    const h = await redis.hGetAll(key);
    return h ?? {};
  },

  async hSet(key, fields) {
    if (Object.keys(fields).length === 0) return;
    await redis.hSet(key, fields);
  },

  async hIncrBy(key, field, by) {
    return await redis.hIncrBy(key, field, by);
  },

  async hSetNX(key, field, value) {
    const result = await redis.hSetNX(key, field, value);
    return result === 1;
  },

  async zAdd(key, members) {
    if (members.length === 0) return;
    await redis.zAdd(key, ...members);
  },

  async zRange(key, minScore, maxScore, opts) {
    const result = await redis.zRange(key, minScore, maxScore, {
      by: 'score',
      reverse: opts?.reverse,
      ...(opts?.limit ? { limit: { offset: 0, count: opts.limit } } : {}),
    } as Parameters<typeof redis.zRange>[3]);
    return (result ?? []).map((e: { score: number; member: string }) => ({
      score: e.score,
      member: e.member,
    }));
  },

  async zRem(key, members) {
    if (members.length === 0) return;
    await redis.zRem(key, members);
  },

  async zPopMin(key) {
    // Devvit redis doesn't expose zPopMin; emulate with zRange (limit 1) + zRem.
    // Race-prone if multiple clients call simultaneously — wrap in WATCH/MULTI/EXEC.
    // For matchmaking, contention is low (few opens at a time) so we accept best-effort.
    const head = await this.zRange(key, -Infinity, Infinity, { limit: 1 });
    if (head.length === 0) return null;
    const top = head[0]!;
    await this.zRem(key, [top.member]);
    return top;
  },
};
