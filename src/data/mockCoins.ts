import type { Coin } from '../types';

export const mockCoins: Coin[] = [
  {
    id: 1,
    name: 'Николай II. 10 рублей 1899',
    description: 'Золотая монета эпохи правления последнего императора.',
    image_url: '',
    tags: [
      { id: 1, label: 'Золото', color: 'secondary' },
      { id: 2, label: 'Редкая', color: 'destructive' },
      { id: 3, label: 'Империя', color: 'primary' },
    ],
    current_price: 85000,
    end_time: '2026-10-01T18:00:00Z',
  },
  {
    id: 2,
    name: 'Серебряный рубль 1723',
    description: 'Петровский рубль, отличная сохранность.',
    image_url: '',
    tags: [
      { id: 4, label: 'Серебро', color: 'accent' },
      { id: 5, label: 'Пётр I', color: 'primary' },
    ],
    current_price: 120000,
    end_time: '2026-10-03T20:00:00Z',
  },
];