import { useEffect, useRef, useState } from 'react';
import { wsClient } from '@/lib/wsClient';
import { playBidTick, playExtendedGong } from '@/lib/sound';

export interface LiveFeedItem {
  id: string;
  auctionId: number;
  coinName?: string;
  amount: number;
  username: string;
  createdAt: string;
}

interface UseLiveFeedOptions {
  currentUsername?: string;
  onNewBid?: (item: LiveFeedItem) => void;
}

export function useLiveFeed(options: UseLiveFeedOptions = {}) {
  const { currentUsername, onNewBid } = options;
  const [items, setItems] = useState<LiveFeedItem[]>([]);
  const [online, setOnline] = useState(0);
  const [myAuctions, setMyAuctions] = useState<Set<number>>(new Set());

  const onNewBidRef = useRef(onNewBid);
  useEffect(() => {
    onNewBidRef.current = onNewBid;
  }, [onNewBid]);

  useEffect(() => {
    const unsubscribe = wsClient.subscribe((msg) => {
      // ─── Новая ставка ───
      if (msg.type === 'new_bid') {
        const dedupKey = `${msg.auctionId}-${msg.amount}-${msg.username}-${msg.createdAt}`;

        setItems((prev) => {
          if (prev.some((i) => i.id === dedupKey)) return prev;

          const item: LiveFeedItem = {
            id: dedupKey,
            auctionId: msg.auctionId,
            coinName: msg.coinName,
            amount: msg.amount,
            username: msg.username,
            createdAt: msg.createdAt || new Date().toISOString(),
          };

          // 🔊 Звук
          if (msg.username !== currentUsername) {
            // Не от моего имени — играем "тик"
            playBidTick();
          } else {
            // Моя ставка — приятный звук (тот же тик, но можно другой)
            playBidTick();
          }

          // 📢 Уведомляем родителя
          onNewBidRef.current?.(item);

          return [item, ...prev.slice(0, 49)];
        });

        // Запоминаем "мои" аукционы для подсветки
        if (msg.username === currentUsername) {
          setMyAuctions((prev) => new Set(prev).add(msg.auctionId));
        }
      }

      // ─── Последние 20 ставок при подключении ───
      if (msg.type === 'recent_bids' && Array.isArray(msg.bids)) {
        setItems(
          msg.bids.map((b: any) => ({
            id: `${b.auctionId}-${b.amount}-${b.username}-${b.createdAt}`,
            auctionId: b.auctionId,
            coinName: b.coinName,
            amount: b.amount,
            username: b.username,
            createdAt: b.createdAt,
          }))
        );
      }

      // ─── Продление (anti-sniping) ───
      if (msg.type === 'auction_extended') {
        playExtendedGong();
      }

      // ─── Онлайн ───
      if (msg.type === 'online_count') {
        setOnline(msg.count);
      }
    });

    return unsubscribe;
  }, [currentUsername]);

  const clear = () => setItems([]);

  return { items, online, clear, myAuctions };
}