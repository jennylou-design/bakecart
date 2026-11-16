import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartCustomizationOption = {
  id: string;
  name: string;
  type: "flavor" | "frosting" | "decoration";
  additionalPrice: number;
};

export type CustomCakeDetails = {
  options: CartCustomizationOption[];
  cakeMessage: string;
  specialInstructions: string;
  referenceImagePath: string | null;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  price: number;
  image: string | null;
  quantity: number;
  stockQuantity: number;
  customCake?: CustomCakeDetails;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.id === newItem.id
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === newItem.id
                  ? {
                      ...item,
                      quantity: Math.min(
                        item.quantity + newItem.quantity,
                        item.stockQuantity
                      ),
                    }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...newItem,
                quantity: Math.min(
                  newItem.quantity,
                  newItem.stockQuantity
                ),
              },
            ],
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: Math.max(
                    1,
                    Math.min(quantity, item.stockQuantity)
                  ),
                }
              : item
          ),
        })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () =>
        get().items.reduce(
          (total, item) => total + item.quantity,
          0
        ),

      getSubtotal: () =>
        get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        ),
    }),
    {
      name: "bakecart-shopping-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
