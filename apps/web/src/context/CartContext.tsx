'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';

interface FoodItem {
  _id: string;
  name: string;
  price: number;
  isVeg: boolean;
  image?: string;
  restaurant: string;
}

interface CartItem {
  foodItem: FoodItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { foodItem: FoodItem; restaurantId: string; restaurantName: string } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QTY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

const initialState: CartState = { items: [], restaurantId: null, restaurantName: null };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { foodItem, restaurantId, restaurantName } = action.payload;
      if (state.restaurantId && state.restaurantId !== restaurantId) {
        return {
          items: [{ foodItem, quantity: 1 }],
          restaurantId,
          restaurantName,
        };
      }
      const existing = state.items.find((i) => i.foodItem._id === foodItem._id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.foodItem._id === foodItem._id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        ...state,
        restaurantId,
        restaurantName,
        items: [...state.items, { foodItem, quantity: 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.foodItem._id !== action.payload),
        restaurantId: state.items.length === 1 ? null : state.restaurantId,
        restaurantName: state.items.length === 1 ? null : state.restaurantName,
      };
    case 'UPDATE_QTY': {
      const { id, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.foodItem._id !== id),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.foodItem._id === id ? { ...i, quantity } : i
        ),
      };
    }
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
}

interface CartContextType {
  cart: CartState;
  addItem: (foodItem: FoodItem, restaurantId: string, restaurantName: string) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback(
    (foodItem: FoodItem, restaurantId: string, restaurantName: string) => {
      dispatch({ type: 'ADD_ITEM', payload: { foodItem, restaurantId, restaurantName } });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQty = useCallback((id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QTY', payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const total = cart.items.reduce((sum, i) => sum + i.foodItem.price * i.quantity, 0);
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
