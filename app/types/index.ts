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
  driverId: string;
  phone: string;
  latitude: number;
  longitude: number;
  address: string;
  status: 'available' | 'busy' | 'offline';
  vehicleType: 'bike' | 'car' | 'van' | 'truck';
  vehicleNumber: string;
  createdAt: number;
}