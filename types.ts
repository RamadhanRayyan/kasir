
export enum Category {
  MAKANAN = 'Makanan',
  MINUMAN = 'Minuman',
  KEBUTUHAN_POKOK = 'Kebutuhan Pokok',
  ALAT_TULIS = 'Alat Tulis',
  LAINNYA = 'Lainnya'
}

export interface CooperativeAccount {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'Cash';
  date: string; // ISO String
}

export interface ReportStats {
  totalRevenue: number;
  totalProfit: number;
  transactionCount: number;
  topProducts: { name: string; quantity: number }[];
}
