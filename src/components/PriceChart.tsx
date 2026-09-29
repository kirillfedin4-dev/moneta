import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export interface PricePoint {
  amount: number;
  time: string;
  username: string;
}

interface PriceChartProps {
  data: PricePoint[];
  startPrice: number;
}

export function PriceChart({ data, startPrice }: PriceChartProps) {
  const wrapperStyle = {
    backgroundColor: 'var(--site-card)',
    border: '1px solid var(--site-border)',
  };

  if (data.length === 0) {
    return (
      <div className="p-6 text-center" style={wrapperStyle}>
        <p
          className="text-[11px] uppercase font-bold mb-3"
          style={{ letterSpacing: '0.2em', color: 'var(--site-muted)' }}
        >
          История цены
        </p>
        <p className="font-serif text-3xl font-bold" style={{ color: 'var(--site-text)' }}>
          {startPrice.toLocaleString('ru-RU')} ₽
        </p>
        <p className="text-[12px] font-medium mt-2" style={{ color: 'var(--site-muted)' }}>
          Пока никто не делал ставок
        </p>
      </div>
    );
  }

  const chartData = [
    { label: 'Старт', amount: startPrice, time: null, username: '—' },
    ...data.map((point, idx) => ({
      label: `#${idx + 1}`,
      amount: point.amount,
      time: new Date(point.time).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      username: point.username,
    })),
  ];

  return (
    <div className="p-6" style={wrapperStyle}>
      <div className="flex justify-between items-center mb-5">
        <p
          className="text-[11px] uppercase font-bold"
          style={{ letterSpacing: '0.2em', color: 'var(--site-muted)' }}
        >
          История цены
        </p>
        <p
          className="text-[11px] uppercase font-bold"
          style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
        >
          {data.length} {data.length === 1 ? 'ставка' : 'ставок'}
        </p>
      </div>

      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(10,10,10,0.08)" />

            <XAxis
              dataKey="label"
              stroke="rgba(10,10,10,0.3)"
              tick={{ fill: 'rgba(10,10,10,0.55)', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: 'rgba(10,10,10,0.15)' }}
            />

            <YAxis
              stroke="rgba(10,10,10,0.3)"
              tick={{ fill: 'rgba(10,10,10,0.55)', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: 'rgba(10,10,10,0.15)' }}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#FBF7EF',
                border: '1px solid #D6C9AE',
                borderRadius: 0,
                padding: '10px 14px',
                color: '#0A0A0A',
                fontFamily: 'Inter, sans-serif',
              }}
              labelStyle={{
                color: '#0A0A0A',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
              formatter={(value: number) => [
                `${value.toLocaleString('ru-RU')} ₽`,
                '',
              ]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                if (!item) return label;
                return item.time ? `${label} · ${item.time} · ${item.username}` : label;
              }}
            />

            <Line
              type="monotone"
              dataKey="amount"
              stroke="#9C7326"
              strokeWidth={2}
              dot={{ r: 3, fill: '#9C7326', stroke: '#FBF7EF', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#FF6C0A' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        className="flex justify-between text-[10px] uppercase font-bold mt-4"
        style={{ letterSpacing: '0.15em', color: 'var(--site-muted)' }}
      >
        <span>Старт: {startPrice.toLocaleString('ru-RU')} ₽</span>
        <span>Финал: {data[data.length - 1].amount.toLocaleString('ru-RU')} ₽</span>
      </div>
    </div>
  );
}