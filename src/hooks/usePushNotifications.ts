import { useEffect, useState } from 'react';
import { wsClient } from '@/lib/wsClient';

type Permission = 'default' | 'granted' | 'denied';

export function usePushNotifications() {
  const [permission, setPermission] = useState<Permission>('default');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    setPermission(Notification.permission);
    setEnabled(
      Notification.permission === 'granted' &&
        localStorage.getItem('push_enabled') === '1'
    );
  }, []);

  // Запрос разрешения
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) {
      alert('Ваш браузер не поддерживает уведомления');
      return false;
    }

    if (Notification.permission === 'granted') {
      localStorage.setItem('push_enabled', '1');
      setPermission('granted');
      setEnabled(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      alert(
        'Уведомления заблокированы. Разрешите их в настройках браузера (значок замка в адресной строке).'
      );
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      localStorage.setItem('push_enabled', '1');
      setEnabled(true);
      return true;
    }
    return false;
  };

  const disable = () => {
    localStorage.setItem('push_enabled', '0');
    setEnabled(false);
  };

  // Показ системного пуша
  const show = (title: string, body: string, url?: string) => {
    if (typeof window === 'undefined') return;
    if (!enabled) return;
    if (Notification.permission !== 'granted') return;

    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'moneta-' + Date.now(), // каждое уведомление отдельно
      requireInteraction: false,
    });

    if (url) {
      n.onclick = () => {
        window.focus();
        window.location.href = url;
        n.close();
      };
    }

    // Автозакрытие через 8 секунд
    setTimeout(() => n.close(), 8000);
  };

  // Слушаем события от WebSocket и показываем пуши
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = wsClient.subscribe((msg) => {
      // Вас перебили
      if (msg.type === 'outbid') {
        show(
          'Ставку перебили',
          `${msg.coinName}: новая ставка ${Number(
            msg.newAmount
          ).toLocaleString('ru-RU')} ₽`,
          `/coin/${msg.auctionId}`
        );
      }

      // Аукцион завершён
      if (msg.type === 'auction_closed') {
        show(
          'Аукцион завершён',
          `Проверьте результат`,
          `/coin/${msg.auctionId}`
        );
      }

      // Аукцион продлён
      if (msg.type === 'auction_extended') {
        show(
          'Аукцион продлён',
          `${msg.byUser} сделал ставку в последние минуты`,
          `/coin/${msg.auctionId}`
        );
      }
            // 🏆 Вы выиграли
      if (msg.type === 'auction_won') {
        show(
          '🏆 Вы выиграли лот!',
          `${msg.coinName} за ${Number(msg.finalPrice).toLocaleString('ru-RU')} ₽`,
          `/coin/${msg.auctionId}`
        );
      }

      // 📢 Ваш лот продан
      if (msg.type === 'auction_sold') {
        show(
          'Лот продан',
          msg.hasWinner
            ? `${msg.coinName} за ${Number(msg.finalPrice).toLocaleString('ru-RU')} ₽`
            : `${msg.coinName} — без ставок`,
          `/coin/${msg.auctionId}`
        );
      }

      // 💔 Лот ушёл другому
      if (msg.type === 'auction_lost') {
        show(
          'Аукцион завершён',
          `${msg.coinName} ушёл за ${Number(msg.finalPrice).toLocaleString('ru-RU')} ₽`,
          `/coin/${msg.auctionId}`
        );
      }
    });

    return unsubscribe;
  }, [enabled]);

  return {
    permission,
    enabled,
    requestPermission,
    disable,
    show,
  };
}