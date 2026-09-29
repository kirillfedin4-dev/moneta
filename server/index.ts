import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import {
  getCoins,
  getCoinById,
  getBidsByAuction,
  getAuctionWithBids,
  getAuctionPriceHistory,
  createCoin,
  getAllTags,
  placeBid,
  getCoinImages,
  addCoinImage,
  deleteCoinImage,
  updateCoinImageRole,
  setProxyBid,
  getUserProxy,
  tryProxyOverride,
  cancelProxyBid,
  getShopCoins,
  getShopCoinById,
  searchAuctionCoins,
  getAllTagsWithCount,
  getAllTagsGrouped,
    getUserSummary,
  getUserBids,
  getUserWins,
  getUserLots,
  getUserSales,
  getUserPurchases,
  getUserReviews,
  createReview,
} from './queries';
import {
  initWebSocket,
  broadcastBid,
  broadcastAuctionExtended,
  sendToUser,
} from './ws';
import { startScheduler } from './scheduler';
import {
  registerUser,
  loginUser,
  signToken,
  requireAuth,
  AuthRequest,
} from './auth';
import { upload, UPLOADS_URL_PREFIX } from './upload';
import { pool } from './db';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.use(
  UPLOADS_URL_PREFIX,
  express.static(path.join(process.cwd(), 'server', 'uploads'))
);

// ─────── HEALTH ───────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─────── МОНЕТЫ ───────
app.get('/api/coins', async (_req, res) => {
  try {
    res.json(await getCoins());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch coins' });
  }
});

app.get('/api/coins/:id', async (req, res) => {
  try {
    const coin = await getCoinById(Number(req.params.id));
    if (!coin) return res.status(404).json({ error: 'Coin not found' });
    res.json(coin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch coin' });
  }
});

app.get('/api/coins/:id/images', async (req, res) => {
  try {
    res.json(await getCoinImages(Number(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.get('/api/tags/grouped', async (_req, res) => {
  try {
    res.json(await getAllTagsGrouped());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});
// 🔍 Поиск лотов аукциона
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q as string | undefined;
    const tags = req.query.tags
      ? String(req.query.tags)
          .split(',')
          .map(Number)
          .filter((n) => !isNaN(n))
      : [];
    const metal = req.query.metal as string | undefined;
    const year_from = req.query.year_from
      ? Number(req.query.year_from)
      : undefined;
    const year_to = req.query.year_to ? Number(req.query.year_to) : undefined;
    const price_from = req.query.price_from
      ? Number(req.query.price_from)
      : undefined;
    const price_to = req.query.price_to
      ? Number(req.query.price_to)
      : undefined;
    const sort = req.query.sort as any;
    const limit = req.query.limit ? Number(req.query.limit) : 24;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const result = await searchAuctionCoins({
      q,
      tag_ids: tags,
      metal,
      year_from,
      year_to,
      price_from,
      price_to,
      sort,
      limit,
      offset,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 🏷 Список тэгов с количеством
app.get('/api/tags/with-count', async (_req, res) => {
  try {
    res.json(await getAllTagsWithCount());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.get('/api/tags/grouped', async (_req, res) => {
  try {
    res.json(await getAllTagsGrouped());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});
// ─────── ЛИЧНЫЙ КАБИНЕТ ───────

app.get('/api/me/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await getUserSummary(req.user!.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

app.get('/api/me/bids', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await getUserBids(req.user!.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

app.get('/api/me/wins', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await getUserWins(req.user!.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wins' });
  }
});

app.get('/api/me/lots', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await getUserLots(req.user!.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

app.get('/api/me/sales', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await getUserSales(req.user!.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

app.get('/api/me/purchases', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await getUserPurchases(req.user!.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

app.get('/api/users/:id/reviews', async (req, res) => {
  try {
    res.json(await getUserReviews(Number(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/users/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { auction_id, order_id, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating 1-5 required' });
    }

    const review = await createReview({
      from_user_id: req.user!.userId,
      to_user_id: Number(req.params.id),
      auction_id,
      order_id,
      rating: Number(rating),
      comment,
    });

    res.status(201).json(review);
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});
app.post(
  '/api/coins/:id/images',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { image_url, role } = req.body;
      if (!image_url)
        return res.status(400).json({ error: 'image_url required' });
      const image = await addCoinImage(
        Number(req.params.id),
        image_url,
        role || 'other'
      );
      res.status(201).json(image);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add image' });
    }
  }
);

app.patch('/api/images/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'role required' });
    const image = await updateCoinImageRole(Number(req.params.id), role);
    res.json(image);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

app.delete('/api/images/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteCoinImage(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ─────── АУКЦИОНЫ ───────
app.get('/api/auctions/:id', async (req, res) => {
  try {
    const data = await getAuctionWithBids(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'Auction not found' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch auction' });
  }
});

app.get('/api/auctions/:id/history', async (req, res) => {
  try {
    res.json(await getAuctionPriceHistory(Number(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

app.get('/api/auctions/:id/bids', async (req, res) => {
  try {
    res.json(await getBidsByAuction(Number(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// УСТАНОВИТЬ АВТО-СТАВКУ
app.post(
  '/api/auctions/:id/proxy',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const auctionId = Number(req.params.id);
      const { max_amount } = req.body;
      const userId = req.user!.userId;

      if (!max_amount || Number(max_amount) <= 0) {
        return res.status(400).json({ error: 'max_amount required' });
      }

      const result = await setProxyBid(auctionId, userId, Number(max_amount));

      const auctionInfo = await pool.query(
        `SELECT c.name FROM auctions a JOIN coins c ON c.id = a.coin_id WHERE a.id = $1`,
        [auctionId]
      );
      const coinName = auctionInfo.rows[0]?.name || '';

      broadcastBid(auctionId, {
        amount: result.newPrice,
        username: req.user!.username,
        createdAt: new Date().toISOString(),
        coinName,
      });

      if (result.prevLeaderId) {
        sendToUser(result.prevLeaderId, {
          type: 'outbid',
          auctionId,
          coinName,
          newAmount: result.newPrice,
          yourAmount: result.prevLeaderAmount,
          newBidder: req.user!.username,
          createdAt: new Date().toISOString(),
        });
      }

      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ПОЛУЧИТЬ МОЮ АВТО-СТАВКУ
app.get(
  '/api/auctions/:id/my-proxy',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const auctionId = Number(req.params.id);
      const userId = req.user!.userId;
      const proxy = await getUserProxy(auctionId, userId);
      res.json(proxy || null);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch proxy' });
    }
  }
);

// ОТМЕНИТЬ АВТО-СТАВКУ
app.delete(
  '/api/auctions/:id/proxy',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const auctionId = Number(req.params.id);
      const userId = req.user!.userId;
      const cancelled = await cancelProxyBid(auctionId, userId);
      res.json({ ok: true, cancelled });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to cancel proxy' });
    }
  }
);

// ─────── СТАВКА ───────
app.post(
  '/api/auctions/:id/bids',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const auctionId = Number(req.params.id);
      const { amount } = req.body;
      const userId = req.user!.userId;

      if (!amount) return res.status(400).json({ error: 'amount required' });

      const result = await placeBid(auctionId, userId, Number(amount));

      const auctionInfo = await pool.query(
        `SELECT c.name FROM auctions a JOIN coins c ON c.id = a.coin_id WHERE a.id = $1`,
        [auctionId]
      );
      const coinName = auctionInfo.rows[0]?.name || '';

      broadcastBid(auctionId, {
        amount: Number(amount),
        username: req.user!.username,
        createdAt: new Date().toISOString(),
        coinName,
      });

      if (result.extended) {
        broadcastAuctionExtended(
          auctionId,
          result.newEndTime,
          req.user!.username
        );
      }

      if (result.prevLeaderId) {
        sendToUser(result.prevLeaderId, {
          type: 'outbid',
          auctionId,
          coinName,
          newAmount: Number(amount),
          yourAmount: result.prevLeaderAmount,
          newBidder: req.user!.username,
          createdAt: new Date().toISOString(),
        });
      }

      const proxyResults = await tryProxyOverride(
        auctionId,
        userId,
        Number(amount)
      );

      for (const p of proxyResults) {
        const userRes = await pool.query(
          `SELECT username FROM users WHERE id = $1`,
          [p.userId]
        );
        const proxyUsername = userRes.rows[0]?.username || 'авто';

        broadcastBid(auctionId, {
          amount: p.newAmount,
          username: `${proxyUsername} [авто]`,
          createdAt: new Date().toISOString(),
          coinName,
        });

        sendToUser(userId, {
          type: 'outbid',
          auctionId,
          coinName,
          newAmount: p.newAmount,
          yourAmount: Number(amount),
          newBidder: `${proxyUsername} [авто]`,
          createdAt: new Date().toISOString(),
        });

        result.newPrice = p.newAmount;
      }

      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  }
);

// ─────── МАГАЗИН ───────
app.get('/api/shop', async (_req, res) => {
  try {
    res.json(await getShopCoins());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shop items' });
  }
});

app.get('/api/shop/:id', async (req, res) => {
  try {
    const item = await getShopCoinById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

app.post(
  '/api/shop/:id/buy',
  requireAuth,
  async (req: AuthRequest, res) => {
    const client = await pool.connect();
    try {
      const coinId = Number(req.params.id);
      const userId = req.user!.userId;

      await client.query('BEGIN');

      // Обновляем монету — резервируем товар
      const coinRes = await client.query(
        `UPDATE coins
         SET in_stock = FALSE
         WHERE id = $1 AND listing_type = 'shop' AND in_stock = TRUE
         RETURNING id, fixed_price, name, seller_id`,
        [coinId]
      );

      if (!coinRes.rows.length) {
        await client.query('ROLLBACK');
        return res
          .status(400)
          .json({ error: 'Товар недоступен или уже продан' });
      }

      const coin = coinRes.rows[0];

      // Создаём заказ
      const orderRes = await client.query(
        `INSERT INTO orders (coin_id, buyer_id, seller_id, price, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, created_at`,
        [coinId, userId, coin.seller_id, coin.fixed_price]
      );

      await client.query('COMMIT');

      res.json({
        ok: true,
        order: {
          id: orderRes.rows[0].id,
          coinId: coin.id,
          name: coin.name,
          price: Number(coin.fixed_price),
          buyerId: userId,
          createdAt: orderRes.rows[0].created_at,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'Failed to buy' });
    } finally {
      client.release();
    }
  }
);

// ─────── ТЭГИ ───────
app.get('/api/tags', async (_req, res) => {
  try {
    res.json(await getAllTags());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// ─────── UPLOAD ───────
app.post(
  '/api/upload',
  requireAuth,
  upload.single('image'),
  (req: AuthRequest, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `${UPLOADS_URL_PREFIX}/${req.file.filename}`;
    res.json({ url });
  }
);

// ─────── AUTH ───────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: 'username, email, password required' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 chars' });
    }

    const user = await registerUser(username, email, password);
    const token = signToken(user.id, user.username);
    res.status(201).json({ user, token });
  } catch (err: any) {
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Username or email already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await loginUser(username, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user.id, user.username);
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({
    user: {
      id: req.user!.userId,        // ← ВАЖНО: переименовываем userId → id
      username: req.user!.username,
    },
  });
});

// ─────── СОЗДАТЬ МОНЕТУ ───────
app.post('/api/coins', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      image_url,
      year,
      country,
      metal,
      weight_g,
      condition,
      start_price,
      bid_step,
      duration_days,
      fixed_price,
      listing_type,
      tag_ids,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }

    if (listing_type === 'shop' && !fixed_price) {
      return res.status(400).json({ error: 'fixed_price required for shop' });
    }

    if (listing_type !== 'shop' && (!start_price || !duration_days)) {
      return res
        .status(400)
        .json({ error: 'start_price, duration_days required for auction' });
    }

    const result = await createCoin({
      name,
      description: description || '',
      image_url: image_url || null,
      year: year ? Number(year) : null,
      country: country || null,
      metal: metal || null,
      weight_g: weight_g ? Number(weight_g) : null,
      condition: condition || null,
      start_price: start_price ? Number(start_price) : 0,
      bid_step: Number(bid_step) || 100,
      duration_days: duration_days ? Number(duration_days) : 0,
      tag_ids: Array.isArray(tag_ids) ? tag_ids.map(Number) : [],
      seller_id: req.user!.userId,
      listing_type: listing_type || 'auction',
      fixed_price: fixed_price ? Number(fixed_price) : null,
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('❌ createCoin error:', err);
    res.status(500).json({ error: 'Failed to create coin' });
  }
});

// ─────── HTTP + WS ───────
const httpServer = createServer(app);
initWebSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 API server running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/ws`);
  startScheduler();
});