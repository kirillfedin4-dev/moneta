import { useEffect, useRef } from 'react';

interface AuctionSocketOptions {
  onNewBid?: (event: {
    amount: number;
    username: string;
    createdAt: string;
  }) => void;
  onAuctionClosed?: () => void;
  onAuctionExtended?: (event: {
    newEndTime: string;
    byUser: string;
  }) => void;
}

export function useAuctionSocket(
  auctionId: number | null,
  options: AuctionSocketOptions
) {
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);

  // Держим актуальный колбэк без реконнекта
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!auctionId) return;

    const ws = new WebSocket('ws://localhost:4000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', auctionId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.auctionId !== auctionId) return;

        if (msg.type === 'new_bid') {
          optionsRef.current.onNewBid?.(msg);
        }
        if (msg.type === 'auction_closed') {
          optionsRef.current.onAuctionClosed?.();
        }
        if (msg.type === 'auction_extended') {
          optionsRef.current.onAuctionExtended?.(msg);
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onerror = () => {
      // Игнорируем ошибку при размонтировании в StrictMode
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [auctionId]);
}