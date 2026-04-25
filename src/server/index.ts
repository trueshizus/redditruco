import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import type {
  ActionBody,
  ActionResponse,
  CreateMatchBody,
  CreateMatchResponse,
  FindMatchResponse,
  GetEventsResponse,
  GetMatchResponse,
  HeartbeatResponse,
  JoinMatchBody,
  JoinMatchResponse,
  ListOpenResponse,
  ReplayResponse,
} from '../shared/types/match-api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { createMatchService } from './matchService';
import { devvitStore } from './storage/devvitStore';
import { generateMatchId } from '../shared/truco';
import type { MatchSlot } from '../shared/match';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// ---------- Match service (singleton, wires production deps) ----------

const matchService = createMatchService({
  store: devvitStore,
  now: () => Date.now(),
  randomId: (kind) => `${kind === 'match' ? 'M' : 'T'}-${generateMatchId()}`,
});

// ---------- Helpers ----------

async function requireUserAndPost(
  res: express.Response,
): Promise<{ username: string; postId: string } | null> {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ error: 'postId is required but missing from context' });
    return null;
  }
  const username = await reddit.getCurrentUsername();
  if (!username) {
    res.status(401).json({ error: 'must be logged in' });
    return null;
  }
  return { username, postId };
}

// ---------- Init / Counter (existing) ----------

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({ status: 'error', message: 'postId is required' });
      return;
    }
    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

// ---------- Match endpoints ----------

router.post<unknown, CreateMatchResponse | { error: string }, CreateMatchBody>(
  '/api/matches',
  async (req, res) => {
    const ctx = await requireUserAndPost(res);
    if (!ctx) return;
    const visibility = req.body?.visibility ?? 'public';
    if (visibility !== 'public' && visibility !== 'private') {
      res.status(400).json({ error: 'visibility must be public or private' });
      return;
    }
    const result = await matchService.createMatch({
      postId: ctx.postId,
      creator: ctx.username,
      visibility,
    });
    res.json(result);
  },
);

router.get<unknown, ListOpenResponse | { error: string }>(
  '/api/matches/open',
  async (_req, res) => {
    const ctx = await requireUserAndPost(res);
    if (!ctx) return;
    const limit = 20;
    const matches = await matchService.listOpenInPost(ctx.postId, limit);
    res.json({ matches });
  },
);

router.post<unknown, FindMatchResponse | { error: string }>(
  '/api/matches/find',
  async (_req, res) => {
    const ctx = await requireUserAndPost(res);
    if (!ctx) return;
    const result = await matchService.findOrCreate(ctx.postId, ctx.username);
    res.json(result);
  },
);

router.post<{ id: string }, JoinMatchResponse, JoinMatchBody>(
  '/api/matches/:id/join',
  async (req, res) => {
    const ctx = await requireUserAndPost(res);
    if (!ctx) return;
    const result = await matchService.joinMatch(req.params.id, ctx.username, req.body?.joinToken);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  },
);

router.get<{ id: string }, GetMatchResponse>('/api/matches/:id', async (req, res) => {
  const view = await matchService.getView(req.params.id);
  if (!view) {
    res.status(404).json({ error: 'match not found' });
    return;
  }
  res.json(view);
});

router.get<{ id: string }, GetEventsResponse | { error: string }>(
  '/api/matches/:id/events',
  async (req, res) => {
    const since = req.query.since ? parseInt(String(req.query.since), 10) : 0;
    const events = await matchService.getEvents(req.params.id, isNaN(since) ? 0 : since);
    const view = await matchService.getView(req.params.id);
    if (!view) {
      res.status(404).json({ error: 'match not found' });
      return;
    }
    res.json({ events, lastSeq: view.lastSeq });
  },
);

router.post<{ id: string }, ActionResponse, ActionBody>(
  '/api/matches/:id/action',
  async (req, res) => {
    const ctx = await requireUserAndPost(res);
    if (!ctx) return;
    const action = req.body?.action;
    if (!action || typeof action !== 'object' || !action.type) {
      res.status(400).json({ ok: false, reason: 'action body required' });
      return;
    }
    const result = await matchService.applyAction({
      matchId: req.params.id,
      username: ctx.username,
      action,
      ...(req.body?.expectedSeq != null ? { expectedSeq: req.body.expectedSeq } : {}),
    });
    if (!result.ok) {
      res.status(result.status ?? 400).json({ ok: false, reason: result.reason });
      return;
    }
    res.json({
      ok: true,
      seq: result.seq,
      snapshot: result.snapshot,
      meta: result.meta,
      gameOver: result.gameOver,
    });
  },
);

router.get<{ id: string }, ReplayResponse>('/api/matches/:id/replay', async (req, res) => {
  const replay = await matchService.getReplay(req.params.id);
  if (!replay) {
    res.status(404).json({ error: 'match not found or never started' });
    return;
  }
  res.json(replay);
});

router.post<{ id: string }, HeartbeatResponse>(
  '/api/matches/:id/heartbeat',
  async (req, res) => {
    const ctx = await requireUserAndPost(res);
    if (!ctx) return;
    const slot: MatchSlot | null = await matchService.slotFor(req.params.id, ctx.username);
    if (slot === null) {
      res.status(403).json({ error: 'not a participant' });
      return;
    }
    await matchService.bumpPresence(req.params.id, slot);
    res.json({ ok: true });
  },
);

// ---------- Devvit lifecycle (existing) ----------

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
