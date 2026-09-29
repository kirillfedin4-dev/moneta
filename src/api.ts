import type { Coin } from './types';

const API_URL = 'http://localhost:4000/api';

export async function fetchCoins(): Promise<Coin[]> {
  const res = await fetch(`${API_URL}/coins`);
  if (!res.ok) throw new Error('Failed to load coins');
  return res.json();
}

export async function fetchCoin(id: number): Promise<Coin> {
  const res = await fetch(`${API_URL}/coins/${id}`);
  if (!res.ok) throw new Error('Failed to load coin');
  return res.json();
}