export type TagColor = 'primary' | 'secondary' | 'destructive' | 'accent';

export interface Tag {
  id: number;
  label: string;
  color: TagColor;
}

export interface Coin {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  year: number | null;
  country: string | null;
  metal: string | null;
  weight_g: string | null;
  condition: string | null;

  auction_id: number;
  current_price: string;
  start_price: string;
  bid_step: string;
  end_time: string;
  status: string;

  tags: Tag[];
}