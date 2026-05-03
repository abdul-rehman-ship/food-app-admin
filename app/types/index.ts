export interface Size {
  name: string;
  price: number;
}

export interface FoodItem {
  id?: string;
  name: string;
  price: number;
  description: string;
  ingredients: string[];
  stock: number;
  preparationTime: string;
  sizes: Size[];
  images: string[];
  categoryId: string;
  createdAt: number;
}

export interface Category {
  id?: string;
  name: string;
  createdAt: number;
}

export interface BusinessHours {
  id?: string;
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface ContactInfo {
  id?: string;
  phone: string;
  email: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

export interface RestaurantLocation {
  id?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface Trailor {
  id?: string;
  name: string;
  number: string;
  phone: string;
  latitude: number;
  longitude: number;
  address: string;
  status: 'available' | 'busy' | 'offline';
  createdAt: number;
}

export interface City {
  id?: string;
  name: string;
  state: string;
  deliveryFee: number;
  isActive: boolean;
  createdAt: number;
}

export interface OrderItem {
  basePrice: number;
  foodId: string;
  foodImage: string;
  foodName: string;
  quantity: number;
  selectedSize: string;
  sizePrice: number;
  totalPrice: number;
}

export interface Order {
  id?: string;
  orderId: string;
  userId: string;
  cityId: string;
  cityName: string;
  cityState: string;
  comment: string;
  createdAt: number;
  deliveryAddress: string;
  deliveryFee: number;
  items: OrderItem[];
  orderType: 'delivery' | 'pickup';
  status: 'pending' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'on_the_way' | 'delivered' | 'rejected';
  subtotal: number;
  total: number;
  trailerAddress?: string;
  trailerId?: string | null;
  trailerName?: string;
  trailerPhone?: string;
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  registeredAt: number;
  status: string;
  fcmToken?: string; 
}