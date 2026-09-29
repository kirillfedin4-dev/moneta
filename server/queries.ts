import { pool } from './db';

// ---- Список всех активных аукционов с монетами и тэгами ----
export async function getCoins() {
  const result = await pool.query(`
    SELECT
      c.id, c.name, c.description, c.image_url,
      c.year, c.country, c.metal, c.weight_g, c.condition,
      a.id AS auction_id,
      a.current_price, a.start_price, a.bid_step, a.end_time, a.status,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', t.id, 'label', t.label, 'color', t.color_token
          )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM coins c
    JOIN auctions a        ON a.coin_id = c.id AND a.status = 'active'
    LEFT JOIN coin_tags ct ON ct.coin_id = c.id
    LEFT JOIN tags t       ON t.id = ct.tag_id
    WHERE c.listing_type = 'auction'
    GROUP BY c.id, a.id
    ORDER BY a.end_time ASC
  `);
  return result.rows;
}

// ---- Одна монета ----
export async function getCoinById(id: number) {
  const result = await pool.query(
    `
    SELECT
      c.*,
      a.id AS auction_id,
      a.current_price, a.start_price, a.bid_step, a.end_time, a.status,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', t.id, 'label', t.label, 'color', t.color_token
          )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM coins c
    JOIN auctions a        ON a.coin_id = c.id
    LEFT JOIN coin_tags ct ON ct.coin_id = c.id
    LEFT JOIN tags t       ON t.id = ct.tag_id
    WHERE c.id = $1
    GROUP BY c.id, a.id
    `,
    [id]
  );
  return result.rows[0] || null;
}

// ---- Ставки по аукциону ----
export async function getBidsByAuction(auctionId: number) {
  const result = await pool.query(
    `
    SELECT b.id, b.amount, b.created_at, u.username
    FROM bids b
    JOIN users u ON u.id = b.user_id
    WHERE b.auction_id = $1
    ORDER BY b.created_at DESC
    `,
    [auctionId]
  );
  return result.rows;
}

// ---- Все тэги ----
export async function getAllTags() {
  const result = await pool.query(
    'SELECT id, label, color_token AS color FROM tags ORDER BY label'
  );
  return result.rows;
}

// ---- Создать монету + аукцион + связи с тэгами ----
export async function createCoin(data: {
  name: string;
  description: string;
  image_url: string | null;
  year: number | null;
  country: string | null;
  metal: string | null;
  weight_g: number | null;
  condition: string | null;
  start_price: number;
  bid_step: number;
  duration_days: number;
  tag_ids: number[];
  seller_id: number;
  listing_type?: string;
  fixed_price?: number | null;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

const coinRes = await client.query(
  `INSERT INTO coins
     (name, description, image_url, year, country, metal, weight_g, condition,
      listing_type, fixed_price, seller_id)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
   RETURNING id`,
  [
    data.name,
    data.description,
    data.image_url,
    data.year,
    data.country,
    data.metal,
    data.weight_g,
    data.condition,
    data.listing_type || 'auction',
    data.fixed_price ?? null,
    data.seller_id,        // ← обязательно!
  ]
);

    const coinId = coinRes.rows[0].id;

    if (data.image_url) {
      await client.query(
        `INSERT INTO coin_images (coin_id, image_url, role, sort_order)
         VALUES ($1, $2, 'obverse', 0)`,
        [coinId, data.image_url]
      );
    }

    // Если это магазин — не создаём аукцион
    if (data.listing_type === 'shop') {
      if (data.tag_ids.length) {
        const values = data.tag_ids
          .map((_tagId, i) => `($1, $${i + 2})`)
          .join(',');
        await client.query(
          `INSERT INTO coin_tags (coin_id, tag_id) VALUES ${values}`,
          [coinId, ...data.tag_ids]
        );
      }

      await client.query('COMMIT');
      return { coinId, auctionId: null };
    }

    // Иначе — создаём аукцион
    const auctionRes = await client.query(
      `INSERT INTO auctions
         (coin_id, seller_id, start_price, current_price, bid_step, end_time)
       VALUES ($1, $2, $3, $3, $4, NOW() + ($5 || ' days')::INTERVAL)
       RETURNING id`,
      [coinId, data.seller_id, data.start_price, data.bid_step, data.duration_days]
    );
    const auctionId = auctionRes.rows[0].id;

    if (data.tag_ids.length) {
      const values = data.tag_ids
        .map((_tagId, i) => `($1, $${i + 2})`)
        .join(',');
      await client.query(
        `INSERT INTO coin_tags (coin_id, tag_id) VALUES ${values}`,
        [coinId, ...data.tag_ids]
      );
    }

    await client.query('COMMIT');
    return { coinId, auctionId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ---- Сделать ставку (с anti-sniping) ----
export async function placeBid(
  auctionId: number,
  userId: number,
  amount: number
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const auctionRes = await client.query(
      `SELECT current_price, bid_step, status, end_time,
              anti_snipe_min, extend_min
       FROM auctions WHERE id = $1 FOR UPDATE`,
      [auctionId]
    );
    if (!auctionRes.rows.length) throw new Error('Auction not found');

    const auction = auctionRes.rows[0];
    if (auction.status !== 'active') throw new Error('Auction is not active');

    const now = new Date();
    const endTime = new Date(auction.end_time);
    if (endTime < now) throw new Error('Auction has ended');

    const minBid = Number(auction.current_price) + Number(auction.bid_step);
    if (amount < minBid) throw new Error(`Minimum bid is ${minBid}`);

    const msLeft = endTime.getTime() - now.getTime();
    const antiSnipeMs = Number(auction.anti_snipe_min) * 60 * 1000;
    let newEndTime = endTime;
    let wasExtended = false;

    if (msLeft <= antiSnipeMs) {
      const extendMs = Number(auction.extend_min) * 60 * 1000;
      newEndTime = new Date(now.getTime() + extendMs);
      wasExtended = true;
    }

    const prevLeaderRes = await client.query(
      `SELECT user_id, amount FROM bids
       WHERE auction_id = $1
       ORDER BY amount DESC, created_at ASC
       LIMIT 1`,
      [auctionId]
    );
    const prevLeader = prevLeaderRes.rows[0] || null;

    await client.query(
      `INSERT INTO bids (auction_id, user_id, amount) VALUES ($1, $2, $3)`,
      [auctionId, userId, amount]
    );

    if (wasExtended) {
      await client.query(
        `UPDATE auctions SET current_price = $1, end_time = $2 WHERE id = $3`,
        [amount, newEndTime, auctionId]
      );
    } else {
      await client.query(
        `UPDATE auctions SET current_price = $1 WHERE id = $2`,
        [amount, auctionId]
      );
    }

    await client.query('COMMIT');

    return {
      ok: true,
      newPrice: amount,
      extended: wasExtended,
      newEndTime: newEndTime.toISOString(),
      prevLeaderId:
        prevLeader && prevLeader.user_id !== userId ? prevLeader.user_id : null,
      prevLeaderAmount: prevLeader ? Number(prevLeader.amount) : null,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ---- Закрытие просроченных аукционов ----
export async function closeExpiredAuctions(): Promise<number[]> {
  const expired = await pool.query(
    `SELECT id FROM auctions
     WHERE status = 'active' AND end_time <= NOW()`
  );

  const closedIds: number[] = [];

  for (const row of expired.rows) {
    const auctionId = row.id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const winnerRes = await client.query(
        `SELECT user_id, amount FROM bids
         WHERE auction_id = $1
         ORDER BY amount DESC, created_at ASC
         LIMIT 1`,
        [auctionId]
      );

      const winnerId = winnerRes.rows.length ? winnerRes.rows[0].user_id : null;
      const finalPrice = winnerRes.rows.length ? winnerRes.rows[0].amount : null;

      await client.query(
        `UPDATE auctions
         SET status = 'finished',
             winner_id = $1,
             current_price = COALESCE($2, current_price)
         WHERE id = $3`,
        [winnerId, finalPrice, auctionId]
      );

      await client.query('COMMIT');
      closedIds.push(auctionId);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('closeAuction error', auctionId, e);
    } finally {
      client.release();
    }
  }

  return closedIds;
}

// ---- Аукцион со ставками и галереей ----
export async function getAuctionWithBids(auctionId: number) {
  const auctionRes = await pool.query(
    `
    SELECT
      a.id AS auction_id,
      a.current_price, a.start_price, a.bid_step, a.end_time, a.status,
      a.winner_id,
      c.id, c.name, c.description, c.year, c.country, c.metal,
      c.weight_g, c.condition, c.image_url,
      w.username AS winner_username,
      COALESCE(
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'id', t.id, 'label', t.label, 'color', t.color_token
        )) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags,
      COALESCE(
        (
          SELECT JSON_AGG(
            JSONB_BUILD_OBJECT(
              'id', ci.id,
              'image_url', ci.image_url,
              'role', ci.role,
              'sort_order', ci.sort_order
            ) ORDER BY ci.sort_order ASC, ci.id ASC
          )
          FROM coin_images ci WHERE ci.coin_id = c.id
        ),
        '[]'
      ) AS images
    FROM auctions a
    JOIN coins c       ON c.id = a.coin_id
    LEFT JOIN users w  ON w.id = a.winner_id
    LEFT JOIN coin_tags ct ON ct.coin_id = c.id
    LEFT JOIN tags t       ON t.id = ct.tag_id
    WHERE a.id = $1
    GROUP BY a.id, c.id, w.username
    `,
    [auctionId]
  );

  if (!auctionRes.rows.length) return null;

  const bidsRes = await pool.query(
    `SELECT b.id, b.amount, b.created_at, u.username
     FROM bids b
     JOIN users u ON u.id = b.user_id
     WHERE b.auction_id = $1
     ORDER BY b.created_at DESC`,
    [auctionId]
  );

  return { ...auctionRes.rows[0], bids: bidsRes.rows };
}

// ---- История цены ----
export async function getAuctionPriceHistory(auctionId: number) {
  const result = await pool.query(
    `
    SELECT b.amount, b.created_at, u.username
    FROM bids b
    JOIN users u ON u.id = b.user_id
    WHERE b.auction_id = $1
    ORDER BY b.created_at ASC
    `,
    [auctionId]
  );
  return result.rows.map((r) => ({
    amount: Number(r.amount),
    time: r.created_at,
    username: r.username,
  }));
}

// ---- Множественные фото монеты ----
export async function getCoinImages(coinId: number) {
  const result = await pool.query(
    `SELECT id, image_url, role, sort_order
     FROM coin_images
     WHERE coin_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [coinId]
  );
  return result.rows;
}

export async function addCoinImage(
  coinId: number,
  imageUrl: string,
  role: string = 'other'
) {
  const orderRes = await pool.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
     FROM coin_images WHERE coin_id = $1`,
    [coinId]
  );
  const nextOrder = orderRes.rows[0].next;

  const result = await pool.query(
    `INSERT INTO coin_images (coin_id, image_url, role, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [coinId, imageUrl, role, nextOrder]
  );
  return result.rows[0];
}

export async function deleteCoinImage(imageId: number) {
  await pool.query(`DELETE FROM coin_images WHERE id = $1`, [imageId]);
}

export async function updateCoinImageRole(imageId: number, role: string) {
  const result = await pool.query(
    `UPDATE coin_images SET role = $1 WHERE id = $2 RETURNING *`,
    [role, imageId]
  );
  return result.rows[0];
}

// ─────────────────────────────────────────────
//  АВТО-СТАВКА (proxy bid)
// ─────────────────────────────────────────────

export async function setProxyBid(
  auctionId: number,
  userId: number,
  maxAmount: number
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const auctionRes = await client.query(
      `SELECT current_price, bid_step, status, end_time
       FROM auctions WHERE id = $1 FOR UPDATE`,
      [auctionId]
    );
    if (!auctionRes.rows.length) throw new Error('Auction not found');

    const auction = auctionRes.rows[0];
    if (auction.status !== 'active') throw new Error('Auction is not active');
    if (new Date(auction.end_time) < new Date())
      throw new Error('Auction has ended');

    const currentPrice = Number(auction.current_price);
    const bidStep = Number(auction.bid_step);
    const minBid = currentPrice + bidStep;

    if (maxAmount < minBid) {
      throw new Error(`Максимум должен быть не меньше ${minBid}`);
    }

    await client.query(
      `UPDATE proxy_bids SET is_active = FALSE
       WHERE auction_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [auctionId, userId]
    );

    await client.query(
      `INSERT INTO proxy_bids (auction_id, user_id, max_amount)
       VALUES ($1, $2, $3)`,
      [auctionId, userId, maxAmount]
    );

    const othersRes = await client.query(
      `SELECT pb.id, pb.user_id, pb.max_amount
       FROM proxy_bids pb
       WHERE pb.auction_id = $1
         AND pb.is_active = TRUE
         AND pb.user_id <> $2
       ORDER BY pb.max_amount DESC, pb.created_at ASC`,
      [auctionId, userId]
    );

    let finalPrice = minBid;
    let finalLeaderId = userId;

    for (const other of othersRes.rows) {
      const otherMax = Number(other.max_amount);

      if (otherMax >= maxAmount) {
        finalLeaderId = other.user_id;
        finalPrice = Math.min(maxAmount + bidStep, otherMax);
        break;
      } else {
        finalLeaderId = userId;
        finalPrice = Math.min(otherMax + bidStep, maxAmount);

        await client.query(
          `UPDATE proxy_bids SET is_active = FALSE WHERE id = $1`,
          [other.id]
        );
        break;
      }
    }

    const prevLeaderRes = await client.query(
      `SELECT user_id, amount FROM bids
       WHERE auction_id = $1
       ORDER BY amount DESC, created_at ASC
       LIMIT 1`,
      [auctionId]
    );
    const prevLeader = prevLeaderRes.rows[0] || null;

    await client.query(
      `INSERT INTO bids (auction_id, user_id, amount) VALUES ($1, $2, $3)`,
      [auctionId, finalLeaderId, finalPrice]
    );

    await client.query(
      `UPDATE auctions SET current_price = $1 WHERE id = $2`,
      [finalPrice, auctionId]
    );

    if (finalLeaderId !== userId) {
      await client.query(
        `UPDATE proxy_bids SET is_active = FALSE
         WHERE auction_id = $1 AND user_id = $2 AND is_active = TRUE`,
        [auctionId, userId]
      );
    }

    await client.query('COMMIT');

    return {
      ok: true,
      newPrice: finalPrice,
      maxAmount,
      winnerId: finalLeaderId,
      prevLeaderId:
        prevLeader && prevLeader.user_id !== finalLeaderId
          ? prevLeader.user_id
          : null,
      prevLeaderAmount: prevLeader ? Number(prevLeader.amount) : null,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getUserProxy(auctionId: number, userId: number) {
  const result = await pool.query(
    `SELECT id, max_amount, is_active
     FROM proxy_bids
     WHERE auction_id = $1 AND user_id = $2 AND is_active = TRUE
     LIMIT 1`,
    [auctionId, userId]
  );
  return result.rows[0] || null;
}

export async function tryProxyOverride(
  auctionId: number,
  currentBidderId: number,
  currentAmount: number
): Promise<{ userId: number; newAmount: number }[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const auctionRes = await client.query(
      `SELECT current_price, bid_step FROM auctions WHERE id = $1`,
      [auctionId]
    );
    const bidStep = Number(auctionRes.rows[0].bid_step);
    const nextBid = Number(currentAmount) + bidStep;

    const proxiesRes = await client.query(
      `SELECT pb.id, pb.user_id, pb.max_amount
       FROM proxy_bids pb
       WHERE pb.auction_id = $1
         AND pb.is_active = TRUE
         AND pb.user_id <> $2
       ORDER BY pb.max_amount DESC, pb.created_at ASC`,
      [auctionId, currentBidderId]
    );

    if (!proxiesRes.rows.length) {
      await client.query('COMMIT');
      return [];
    }

    const topProxy = proxiesRes.rows[0];
    const topMax = Number(topProxy.max_amount);

    if (nextBid <= topMax) {
      await client.query(
        `INSERT INTO bids (auction_id, user_id, amount) VALUES ($1, $2, $3)`,
        [auctionId, topProxy.user_id, nextBid]
      );
      await client.query(
        `UPDATE auctions SET current_price = $1 WHERE id = $2`,
        [nextBid, auctionId]
      );

      if (nextBid >= topMax) {
        await client.query(
          `UPDATE proxy_bids SET is_active = FALSE WHERE id = $1`,
          [topProxy.id]
        );
      }

      await client.query('COMMIT');
      return [{ userId: topProxy.user_id, newAmount: nextBid }];
    }

    await client.query('COMMIT');
    return [];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelProxyBid(auctionId: number, userId: number) {
  const result = await pool.query(
    `UPDATE proxy_bids SET is_active = FALSE
     WHERE auction_id = $1 AND user_id = $2 AND is_active = TRUE
     RETURNING id`,
    [auctionId, userId]
  );
  return result.rowCount > 0;
}

// ─────────────────────────────────────────────
//  МАГАЗИН
// ─────────────────────────────────────────────

export async function getShopCoins() {
  const result = await pool.query(`
    SELECT
      c.id,
      c.name,
      c.description,
      c.image_url,
      c.year,
      c.country,
      c.metal,
      c.weight_g,
      c.condition,
      c.fixed_price,
      c.in_stock,
      c.created_at,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', t.id, 'label', t.label, 'color', t.color_token
          )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM coins c
    LEFT JOIN coin_tags ct ON ct.coin_id = c.id
    LEFT JOIN tags t       ON t.id = ct.tag_id
    WHERE c.listing_type = 'shop'
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  return result.rows;
}

export async function getShopCoinById(id: number) {
  const result = await pool.query(
    `
    SELECT
      c.*,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', t.id, 'label', t.label, 'color', t.color_token
          )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags,
      COALESCE(
        (
          SELECT JSON_AGG(
            JSONB_BUILD_OBJECT(
              'id', ci.id,
              'image_url', ci.image_url,
              'role', ci.role,
              'sort_order', ci.sort_order
            ) ORDER BY ci.sort_order ASC, ci.id ASC
          )
          FROM coin_images ci WHERE ci.coin_id = c.id
        ),
        '[]'
      ) AS images
    FROM coins c
    LEFT JOIN coin_tags ct ON ct.coin_id = c.id
    LEFT JOIN tags t       ON t.id = ct.tag_id
    WHERE c.id = $1 AND c.listing_type = 'shop'
    GROUP BY c.id
    `,
    [id]
  );
  return result.rows[0] || null;
}
export async function getAuctionParticipants(auctionId: number) {
  const result = await pool.query(
    `SELECT DISTINCT user_id
     FROM bids
     WHERE auction_id = $1`,
    [auctionId]
  );
  return result.rows.map((r) => r.user_id);
}

export async function getAuctionSellerAndWinner(auctionId: number) {
  const result = await pool.query(
    `SELECT
       a.seller_id,
       a.winner_id,
       c.name AS coin_name,
       a.current_price
     FROM auctions a
     JOIN coins c ON c.id = a.coin_id
     WHERE a.id = $1`,
    [auctionId]
  );
  return result.rows[0] || null;
}
// ─────────────────────────────────────────────
// 🔍 ПОИСК И ФИЛЬТРАЦИЯ
// ─────────────────────────────────────────────

interface SearchFilters {
  q?: string;              // текстовый поиск
  tag_ids?: number[];      // массив ID тэгов
  metal?: string;          // металл
  year_from?: number;      // год от
  year_to?: number;        // год до
  price_from?: number;     // цена от
  price_to?: number;       // цена до
  sort?: 'new' | 'price_asc' | 'price_desc' | 'ending_soon' | 'popular';
  limit?: number;
  offset?: number;
}

export async function searchAuctionCoins(filters: SearchFilters) {
  const conditions: string[] = [`c.listing_type = 'auction'`, `a.status = 'active'`];
  const params: any[] = [];
  let paramIdx = 1;

  // 📝 Текстовый поиск по названию и описанию
  if (filters.q && filters.q.trim()) {
    const q = `%${filters.q.trim().toLowerCase()}%`;
    conditions.push(
      `(LOWER(c.name) LIKE $${paramIdx} OR LOWER(c.description) LIKE $${paramIdx})`
    );
    params.push(q);
    paramIdx++;
  }

  // 🏷 Фильтр по тэгам (монета должна иметь ВСЕ указанные тэги)
  if (filters.tag_ids && filters.tag_ids.length > 0) {
    conditions.push(`
      c.id IN (
        SELECT coin_id FROM coin_tags
        WHERE tag_id = ANY($${paramIdx}::int[])
        GROUP BY coin_id
        HAVING COUNT(DISTINCT tag_id) = ${filters.tag_ids.length}
      )
    `);
    params.push(filters.tag_ids);
    paramIdx++;
  }

  // ⚙️ Металл
  if (filters.metal) {
    conditions.push(`LOWER(c.metal) = LOWER($${paramIdx})`);
    params.push(filters.metal);
    paramIdx++;
  }

  // 📅 Год от/до
  if (filters.year_from) {
    conditions.push(`c.year >= $${paramIdx}`);
    params.push(filters.year_from);
    paramIdx++;
  }
  if (filters.year_to) {
    conditions.push(`c.year <= $${paramIdx}`);
    params.push(filters.year_to);
    paramIdx++;
  }

  // 💰 Цена от/до (для аукциона — текущая цена)
  if (filters.price_from) {
    conditions.push(`a.current_price >= $${paramIdx}`);
    params.push(filters.price_from);
    paramIdx++;
  }
  if (filters.price_to) {
    conditions.push(`a.current_price <= $${paramIdx}`);
    params.push(filters.price_to);
    paramIdx++;
  }

  // 📊 Сортировка
  let orderBy = 'a.end_time ASC'; // по умолчанию — скоро закончатся
  if (filters.sort === 'new') orderBy = 'a.created_at DESC';
  else if (filters.sort === 'price_asc') orderBy = 'a.current_price ASC';
  else if (filters.sort === 'price_desc') orderBy = 'a.current_price DESC';
  else if (filters.sort === 'popular') orderBy = 'bid_count DESC, a.end_time ASC';
  else if (filters.sort === 'ending_soon') orderBy = 'a.end_time ASC';

  const limit = filters.limit || 24;
  const offset = filters.offset || 0;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      c.id, c.name, c.description, c.image_url,
      c.year, c.country, c.metal, c.weight_g, c.condition,
      a.id AS auction_id,
      a.current_price, a.start_price, a.bid_step, a.end_time, a.status,
      COALESCE(
        (SELECT COUNT(*)::int FROM bids b WHERE b.auction_id = a.id),
        0
      ) AS bid_count,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', t.id, 'label', t.label, 'color', t.color_token
          )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM coins c
    JOIN auctions a        ON a.coin_id = c.id
    LEFT JOIN coin_tags ct ON ct.coin_id = c.id
    LEFT JOIN tags t       ON t.id = ct.tag_id
    ${whereClause}
    GROUP BY c.id, a.id
    ORDER BY ${orderBy}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `,
    [...params, limit, offset]
  );

  return result.rows;
}

// Все тэги с usage_count
export async function getAllTagsWithCount() {
  const result = await pool.query(
    `SELECT id, label, color_token AS color, category, usage_count
     FROM tags
     ORDER BY usage_count DESC, label ASC`
  );
  return result.rows;
}

export async function getAllTagsGrouped() {
  const result = await pool.query(
    `SELECT id, label, color_token AS color, category, usage_count, is_dynamic, sort_order
     FROM tags
     ORDER BY category, sort_order, label`
  );

  // Группируем по категориям
  const grouped: Record<string, any[]> = {};
  for (const tag of result.rows) {
    if (!grouped[tag.category]) grouped[tag.category] = [];
    grouped[tag.category].push(tag);
  }

  return grouped;
}
// ─────────────────────────────────────────────
// 👤 ЛИЧНЫЙ КАБИНЕТ
// ─────────────────────────────────────────────

// Сводка по пользователю
export async function getUserSummary(userId: number) {
  // Ставки, где я лидирую
  const leading = await pool.query(
    `SELECT COUNT(DISTINCT a.id)::int AS count
     FROM bids b
     JOIN auctions a ON a.id = b.auction_id
     WHERE b.user_id = $1
       AND a.status = 'active'
       AND b.amount = (
         SELECT MAX(amount) FROM bids WHERE auction_id = a.id
       )`,
    [userId]
  );

  // Активные ставки (все, где я участвовал и аукцион ещё идёт)
  const activeBids = await pool.query(
    `SELECT COUNT(DISTINCT a.id)::int AS count
     FROM bids b
     JOIN auctions a ON a.id = b.auction_id
     WHERE b.user_id = $1 AND a.status = 'active'`,
    [userId]
  );

  // Победы (выигранные аукционы)
  const won = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM auctions
     WHERE winner_id = $1 AND status = 'finished'`,
    [userId]
  );

  // Мои активные лоты
  const myLots = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM auctions a
     JOIN coins c ON c.id = a.coin_id
     WHERE c.id IN (SELECT coin_id FROM coins WHERE listing_type = 'auction')
       AND a.status = 'active'
       AND a.seller_id = $1`,
    [userId]
  );

  // Мои проданные лоты
  const sold = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM auctions
     WHERE seller_id = $1 AND status = 'finished' AND winner_id IS NOT NULL`,
    [userId]
  );

  // Покупки в магазине
  const purchases = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM orders
     WHERE buyer_id = $1`,
    [userId]
  );

  return {
    leading: leading.rows[0].count,
    activeBids: activeBids.rows[0].count,
    won: won.rows[0].count,
    myLots: myLots.rows[0].count,
    sold: sold.rows[0].count,
    purchases: purchases.rows[0].count,
  };
}

// Мои ставки (активные аукционы, где я ставил)
export async function getUserBids(userId: number) {
  const result = await pool.query(
    `SELECT DISTINCT ON (a.id)
       a.id AS auction_id,
       a.current_price,
       a.end_time,
       a.status,
       c.id AS coin_id,
       c.name,
       c.image_url,
       c.year,
       c.metal,
       b.amount AS my_max_bid,
       (
         SELECT MAX(amount) FROM bids WHERE auction_id = a.id
       ) AS current_top_bid,
       (
         SELECT user_id FROM bids
         WHERE auction_id = a.id
         ORDER BY amount DESC, created_at ASC
         LIMIT 1
       ) AS leader_id,
       (
         SELECT username FROM users u
         JOIN bids b2 ON b2.user_id = u.id
         WHERE b2.auction_id = a.id
         ORDER BY b2.amount DESC, b2.created_at ASC
         LIMIT 1
       ) AS leader_username
     FROM bids b
     JOIN auctions a ON a.id = b.auction_id
     JOIN coins c ON c.id = a.coin_id
     WHERE b.user_id = $1
     ORDER BY a.id, a.end_time ASC`,
    [userId]
  );
  return result.rows;
}

// Мои победы
export async function getUserWins(userId: number) {
  const result = await pool.query(
    `SELECT
       a.id AS auction_id,
       a.current_price AS final_price,
       a.end_time,
       c.id AS coin_id,
       c.name,
       c.image_url,
       c.year,
       c.metal,
       c.condition
     FROM auctions a
     JOIN coins c ON c.id = a.coin_id
     WHERE a.winner_id = $1 AND a.status = 'finished'
     ORDER BY a.end_time DESC`,
    [userId]
  );
  return result.rows;
}

// Мои лоты (аукцион + магазин)
export async function getUserLots(userId: number) {
  // Аукционы
  const auctions = await pool.query(
    `SELECT
       'auction' AS type,
       a.id AS auction_id,
       a.current_price,
       a.start_price,
       a.bid_step,
       a.end_time,
       a.status,
       c.id AS coin_id,
       c.name,
       c.image_url,
       c.year,
       c.metal,
       (SELECT COUNT(*)::int FROM bids WHERE auction_id = a.id) AS bid_count,
       (
         SELECT username FROM users u
         JOIN bids b ON b.user_id = u.id
         WHERE b.auction_id = a.id
         ORDER BY b.amount DESC, b.created_at ASC
         LIMIT 1
       ) AS leader_username
     FROM auctions a
     JOIN coins c ON c.id = a.coin_id
     WHERE a.seller_id = $1
     ORDER BY a.created_at DESC`,
    [userId]
  );

  // Магазин
  const shop = await pool.query(
    `SELECT
       'shop' AS type,
       NULL AS auction_id,
       c.fixed_price AS current_price,
       NULL AS start_price,
       NULL AS bid_step,
       NULL AS end_time,
       CASE WHEN c.in_stock THEN 'active' ELSE 'sold' END AS status,
       c.id AS coin_id,
       c.name,
       c.image_url,
       c.year,
       c.metal,
       0 AS bid_count,
       NULL AS leader_username
     FROM coins c
     WHERE c.listing_type = 'shop' AND c.seller_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );

  return [...auctions.rows, ...shop.rows];
}

// Мои продажи (завершённые аукционы + проданное в магазине)
export async function getUserSales(userId: number) {
  const auctionSales = await pool.query(
    `SELECT
       'auction' AS type,
       a.id AS auction_id,
       a.current_price AS price,
       a.end_time AS sold_at,
       c.name,
       c.image_url,
       u.username AS buyer_username,
       u.id AS buyer_id
     FROM auctions a
     JOIN coins c ON c.id = a.coin_id
     LEFT JOIN users u ON u.id = a.winner_id
     WHERE a.seller_id = $1
       AND a.status = 'finished'
       AND a.winner_id IS NOT NULL
     ORDER BY a.end_time DESC`,
    [userId]
  );

  const shopSales = await pool.query(
    `SELECT
       'shop' AS type,
       NULL AS auction_id,
       o.price,
       o.created_at AS sold_at,
       c.name,
       c.image_url,
       u.username AS buyer_username,
       u.id AS buyer_id
     FROM orders o
     JOIN coins c ON c.id = o.coin_id
     JOIN users u ON u.id = o.buyer_id
     WHERE o.seller_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );

  return [...auctionSales.rows, ...shopSales.rows];
}

// Мои покупки в магазине
export async function getUserPurchases(userId: number) {
  const result = await pool.query(
    `SELECT
       o.id AS order_id,
       o.price,
       o.status,
       o.created_at,
       c.id AS coin_id,
       c.name,
       c.image_url,
       c.year,
       c.metal,
       u.username AS seller_username
     FROM orders o
     JOIN coins c ON c.id = o.coin_id
     JOIN users u ON u.id = o.seller_id
     WHERE o.buyer_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Обновить рейтинг пользователя
export async function recalcUserRating(userId: number) {
  const result = await pool.query(
    `SELECT
       COALESCE(AVG(rating), 0)::numeric(3,2) AS avg,
       COUNT(*)::int AS count
     FROM reviews
     WHERE to_user_id = $1`,
    [userId]
  );

  await pool.query(
    `UPDATE users
     SET rating_avg = $1, rating_count = $2
     WHERE id = $3`,
    [result.rows[0].avg, result.rows[0].count, userId]
  );

  return result.rows[0];
}

// Получить отзывы о пользователе
export async function getUserReviews(userId: number) {
  const result = await pool.query(
    `SELECT
       r.id, r.rating, r.comment, r.created_at,
       u.username AS from_username,
       u.id AS from_user_id
     FROM reviews r
     JOIN users u ON u.id = r.from_user_id
     WHERE r.to_user_id = $1
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
}

// Оставить отзыв
export async function createReview(data: {
  from_user_id: number;
  to_user_id: number;
  auction_id?: number;
  order_id?: number;
  rating: number;
  comment?: string;
}) {
  // Проверяем, что отзыв ещё не оставлен
  const existing = await pool.query(
    `SELECT id FROM reviews
     WHERE from_user_id = $1 AND to_user_id = $2
       AND (auction_id = $3 OR order_id = $4)`,
    [data.from_user_id, data.to_user_id, data.auction_id || null, data.order_id || null]
  );

  if (existing.rows.length > 0) {
    throw new Error('Отзыв уже оставлен');
  }

  const result = await pool.query(
    `INSERT INTO reviews
       (from_user_id, to_user_id, auction_id, order_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.from_user_id,
      data.to_user_id,
      data.auction_id || null,
      data.order_id || null,
      data.rating,
      data.comment || null,
    ]
  );

  await recalcUserRating(data.to_user_id);

  return result.rows[0];
}