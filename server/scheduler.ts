import { closeExpiredAuctions, getAuctionParticipants, getAuctionSellerAndWinner } from './queries';
import { sendToUser } from './ws';

const INTERVAL_MS = 30 * 1000;

export function startScheduler() {
  console.log('⏰ Auction scheduler started');

  const tick = async () => {
    try {
      const closedIds = await closeExpiredAuctions();

      if (closedIds && closedIds.length > 0) {
        console.log(`✅ Closed ${closedIds.length} expired auction(s)`);

        for (const auctionId of closedIds) {
          const info = await getAuctionSellerAndWinner(auctionId);
          if (!info) continue;

          const finalPrice = Number(info.current_price);
          const participants = await getAuctionParticipants(auctionId);

          // 🏆 Победителю
          if (info.winner_id) {
            sendToUser(info.winner_id, {
              type: 'auction_won',
              auctionId,
              coinName: info.coin_name,
              finalPrice,
              createdAt: new Date().toISOString(),
            });
          }

          // 📢 Продавцу (если он не победитель и не в списке участников)
          if (info.seller_id) {
            sendToUser(info.seller_id, {
              type: 'auction_sold',
              auctionId,
              coinName: info.coin_name,
              finalPrice,
              hasWinner: !!info.winner_id,
              createdAt: new Date().toISOString(),
            });
          }

          // 💔 Проигравшим — всем, кто делал ставки, кроме победителя
          for (const userId of participants) {
            if (userId === info.winner_id) continue;
            if (userId === info.seller_id) continue;

            sendToUser(userId, {
              type: 'auction_lost',
              auctionId,
              coinName: info.coin_name,
              finalPrice,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.error('Scheduler error', err);
    }
  };

  tick();
  setInterval(tick, INTERVAL_MS);
}