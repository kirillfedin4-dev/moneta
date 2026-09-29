import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    (ws as any).isAlive = true;

    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    console.log(`🔌 WS connected · online: ${countOnline()}`);
    broadcastOnline();

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'subscribe' && msg.auctionId) {
          (ws as any).auctionId = msg.auctionId;
          ws.send(JSON.stringify({ type: 'subscribed', auctionId: msg.auctionId }));
        }

        if (msg.type === 'subscribe_all') {
          (ws as any).subscribeAll = true;
          ws.send(JSON.stringify({ type: 'subscribed_all' }));
        }

        // 🔐 Клиент сообщает, кто он — чтобы получать персональные события
        if (msg.type === 'identify' && msg.userId) {
          (ws as any).userId = Number(msg.userId);
          ws.send(JSON.stringify({ type: 'identified', userId: msg.userId }));
        }
      } catch (e) {
        console.error('WS message error', e);
      }
    });

    ws.on('close', () => {
      console.log(`🔌 WS disconnected · online: ${countOnline()}`);
      broadcastOnline();
    });
  });

  // 🩺 Heartbeat
  setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const c = ws as any;
      if (c.isAlive === false) {
        console.log('💀 Terminating dead WS connection');
        return ws.terminate();
      }
      c.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('📡 WebSocket server ready on /ws');
}

function countOnline(): number {
  if (!wss) return 0;
  let n = 0;
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) n++;
  });
  return n;
}

function broadcastOnline() {
  if (!wss) return;
  const count = countOnline();
  const message = JSON.stringify({ type: 'online_count', count });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// 📢 Всем, кто подписан на аукцион или на всё
export function broadcastBid(
  auctionId: number,
  payload: { amount: number; username: string; createdAt: string; coinName?: string }
) {
  if (!wss) return;
  const message = JSON.stringify({
    type: 'new_bid',
    auctionId,
    ...payload,
  });

  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const c = client as any;
    if (c.auctionId === auctionId || c.subscribeAll) {
      client.send(message);
    }
  });
}

// 🎯 Персональное уведомление конкретному пользователю
export function sendToUser(
  userId: number,
  payload: Record<string, unknown>
) {
  if (!wss) return;
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const c = client as any;
    if (c.userId === userId) {
      client.send(message);
    }
  });
}

export function broadcastAuctionExtended(
  auctionId: number,
  newEndTime: string,
  byUser: string
) {
  if (!wss) return;
  const message = JSON.stringify({
    type: 'auction_extended',
    auctionId,
    newEndTime,
    byUser,
  });
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const c = client as any;
    if (c.auctionId === auctionId || c.subscribeAll) {
      client.send(message);
    }
  });
}

export function broadcastAuctionClosed(auctionId: number) {
  if (!wss) return;
  const message = JSON.stringify({ type: 'auction_closed', auctionId });
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    const c = client as any;
    if (c.auctionId === auctionId || c.subscribeAll) {
      client.send(message);
    }
  });
}