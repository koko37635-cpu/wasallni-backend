// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'staff' | 'delivery';
  createdAt: Date;
}

// Order Types
export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered';
  deliveryAddress: string;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  supplier: string;
  lastRestockDate: Date;
}

// Analytics Types
export interface DailyReport {
  date: string;
  totalSales: number;
  ordersCount: number;
  avgOrderValue: number;
  insights: string[];
}

// Forecast Types
export interface ForecastData {
  date: string;
  predictedDemand: number;
  confidence: number;
  recommendation: string;
}
