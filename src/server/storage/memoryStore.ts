// In-memory Store implementation for tests. Mirrors Devvit Redis semantics
// closely enough that swapping in production is transparent.

import type { Store } from './store.js';

type SortedSetEntry = { score: number; member: string };

export function createMemoryStore(opts: { now?: () => number } = {}): Store & {
  /** Test helper: dump everything for debugging. */
  __dump: () => Record<string, unknown>;
} {
  const clock = opts.now ?? (() => Date.now());

  const strings = new Map<string, { value: string; expiresAt: number | null }>();
  const hashes = new Map<string, Map<string, string>>();
  const zsets = new Map<string, SortedSetEntry[]>();

  function reapExpired(key: string): boolean {
    const v = strings.get(key);
    if (!v) return false;
    if (v.expiresAt !== null && clock() >= v.expiresAt) {
      strings.delete(key);
      return false;
    }
    return true;
  }

  return {
    __dump() {
      return {
        strings: Object.fromEntries(strings),
        hashes: Object.fromEntries(
          Array.from(hashes.entries()).map(([k, v]) => [k, Object.fromEntries(v)]),
        ),
        zsets: Object.fromEntries(zsets),
      };
    },

    async get(key) {
      if (!reapExpired(key)) return strings.has(key) ? strings.get(key)!.value : null;
      return strings.get(key)!.value;
    },

    async set(key, value, opts) {
      if (opts?.nx && reapExpired(key)) return false;
      const expiresAt = opts?.ttlSec != null ? clock() + opts.ttlSec * 1000 : null;
      strings.set(key, { value, expiresAt });
      return true;
    },

    async del(...keys) {
      for (const k of keys) {
        strings.delete(k);
        hashes.delete(k);
        zsets.delete(k);
      }
    },

    async expire(key, seconds) {
      const v = strings.get(key);
      if (v) v.expiresAt = clock() + seconds * 1000;
    },

    async exists(key) {
      reapExpired(key);
      return strings.has(key) || hashes.has(key) || zsets.has(key);
    },

    async hGetAll(key) {
      const h = hashes.get(key);
      return h ? Object.fromEntries(h) : {};
    },

    async hSet(key, fields) {
      let h = hashes.get(key);
      if (!h) {
        h = new Map();
        hashes.set(key, h);
      }
      for (const [k, v] of Object.entries(fields)) h.set(k, v);
    },

    async hIncrBy(key, field, by) {
      let h = hashes.get(key);
      if (!h) {
        h = new Map();
        hashes.set(key, h);
      }
      const cur = h.get(field);
      const next = (cur ? parseInt(cur, 10) : 0) + by;
      h.set(field, String(next));
      return next;
    },

    async hSetNX(key, field, value) {
      let h = hashes.get(key);
      if (!h) {
        h = new Map();
        hashes.set(key, h);
      }
      if (h.has(field)) return false;
      h.set(field, value);
      return true;
    },

    async zAdd(key, members) {
      let z = zsets.get(key);
      if (!z) {
        z = [];
        zsets.set(key, z);
      }
      for (const m of members) {
        const idx = z.findIndex((e) => e.member === m.member);
        if (idx >= 0) z[idx]!.score = m.score;
        else z.push({ ...m });
      }
      z.sort((a, b) => a.score - b.score);
    },

    async zRange(key, minScore, maxScore, opts) {
      const z = zsets.get(key);
      if (!z) return [];
      let result = z.filter((e) => e.score >= minScore && e.score <= maxScore);
      if (opts?.reverse) result = [...result].reverse();
      if (opts?.limit) result = result.slice(0, opts.limit);
      return result.map((e) => ({ ...e }));
    },

    async zRem(key, members) {
      const z = zsets.get(key);
      if (!z) return;
      zsets.set(
        key,
        z.filter((e) => !members.includes(e.member)),
      );
    },

    async zPopMin(key) {
      const z = zsets.get(key);
      if (!z || z.length === 0) return null;
      const head = z.shift()!;
      return { ...head };
    },
  };
}
