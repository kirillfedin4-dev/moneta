import { useEffect, useState } from 'react';
import { wsClient } from '@/lib/wsClient';
import { playAuctionClosed } from '@/lib/sound';

export interface OutbidNotification {
  id: string;
  auctionId: number;
  coinName: string;
  newAmount: number;
  yourAmount: number;
  newBidder: string;
  createdAt: string;
}

export function useOutbidNotifications() {
  const [notifications, setNotifications] = useState<OutbidNotification[]>([]);

  useEffect(() => {
    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.type === 'outbid') {
        const notif: OutbidNotification = {
          id: `${msg.auctionId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          auctionId: msg.auctionId,
          coinName: msg.coinName,
          newAmount: msg.newAmount,
          yourAmount: msg.yourAmount,
          newBidder: msg.newBidder,
          createdAt: msg.createdAt,
        };

        setNotifications((prev) => [...prev, notif]);

        // 🔊 Тревожный звук
        playAuctionClosed(); // можно заменить на отдельный "outbid" звук

        // Авто-скрытие через 15 секунд
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        }, 15000);
      }
    });

    return unsubscribe;
  }, []);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return { notifications, dismiss };
}