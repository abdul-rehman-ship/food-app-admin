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