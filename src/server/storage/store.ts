// Minimal storage interface used by matchService.
//
// Only the operations we actually need are exposed, so the in-memory test
// adapter stays small. Production uses devvitStore.ts which wraps
// @devvit/web/server's redis client.
//
// Devvit's Redis surface does NOT expose list operations (rPush/lRange), so
// the event log is stored in a SORTED SET keyed by sequence number. This
// gives us O(log N) append, O(N) range read in seq order, and gap-free reads
// after seq X via zRange(key, X+1, -1, { by: 'score' }).

export interface Store {
  // Strings
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ttlSec?: number; nx?: boolean }): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
  exists(key: string): Promise<boolean>;

  // Hashes
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, fields: Record<string, string>): Promise<void>;
  hIncrBy(key: string, field: string, by: number): Promise<number>;
  /** Sets field only if absent. Returns true if set. */
  hSetNX(key: string, field: string, value: string): Promise<boolean>;

  // Sorted sets
  zAdd(key: string, members: { score: number; member: string }[]): Promise<void>;
  zRange(
    key: string,
    minScore: number,
    maxScore: number,
    opts?: { reverse?: boolean; limit?: number },
  ): Promise<{ score: number; member: string }[]>;
  zRem(key: string, members: string[]): Promise<void>;
  /** Atomic pop-min: returns the lowest-scored member, or null if empty. */
  zPopMin(key: string): Promise<{ score: number; member: string } | null>;
}
