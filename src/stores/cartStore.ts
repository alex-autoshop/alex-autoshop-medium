import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type ShopifyProduct,
  storefrontApiRequest,
  CART_QUERY,
  createShopifyCart,
  addLineToShopifyCart,
  updateShopifyCartLine,
  removeLineFromShopifyCart,
} from '@/lib/shopify';

export interface CartItem {
  lineId: string | null;
  uid: string; // eindeutige lokale ID je Position (auch vor Shopify-Antwort)
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
  attributes?: Array<{ key: string; value: string }>; // z.B. Farbcode, Fahrzeug
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, 'lineId' | 'uid'>) => Promise<void>;
  updateQuantity: (uid: string, quantity: number) => Promise<void>;
  removeItem: (uid: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
}

let uidCounter = 0;
const newUid = () => `${Date.now()}-${uidCounter++}`;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isSyncing: false,
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: async (item) => {
        const { items, cartId, clearCart } = get();
        const hasAttrs = (item.attributes?.length ?? 0) > 0;
        // Konfigurierte Artikel (mit Attributen) NIE zusammenführen — jede Farbe/Variante eigene Position.
        const existingItem = hasAttrs
          ? undefined
          : items.find(i => i.variantId === item.variantId && (i.attributes?.length ?? 0) === 0);

        set({ isLoading: true });
        try {
          if (!cartId) {
            const result = await createShopifyCart({ variantId: item.variantId, quantity: item.quantity, attributes: item.attributes });
            if (result) {
              set({
                cartId: result.cartId,
                checkoutUrl: result.checkoutUrl,
                items: [{ ...item, lineId: result.lineId, uid: newUid() }]
              });
            }
          } else if (existingItem) {
            const newQuantity = existingItem.quantity + item.quantity;
            if (!existingItem.lineId) return;
            const result = await updateShopifyCartLine(cartId, existingItem.lineId, newQuantity);
            if (result.success) {
              set({ items: get().items.map(i => i.uid === existingItem.uid ? { ...i, quantity: newQuantity } : i) });
            } else if (result.cartNotFound) {
              clearCart();
            }
          } else {
            const result = await addLineToShopifyCart(cartId, { variantId: item.variantId, quantity: item.quantity, attributes: item.attributes });
            if (result.success) {
              set({ items: [...get().items, { ...item, lineId: result.lineId ?? null, uid: newUid() }] });
            } else if (result.cartNotFound) {
              clearCart();
            }
          }
        } catch (error) {
          console.error('Failed to add item:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateQuantity: async (uid, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(uid);
          return;
        }
        const { items, cartId, clearCart } = get();
        const item = items.find(i => i.uid === uid);
        if (!item?.lineId || !cartId) return;

        set({ isLoading: true });
        try {
          const result = await updateShopifyCartLine(cartId, item.lineId, quantity);
          if (result.success) {
            set({ items: get().items.map(i => i.uid === uid ? { ...i, quantity } : i) });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } catch (error) {
          console.error('Failed to update quantity:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (uid) => {
        const { items, cartId, clearCart } = get();
        const item = items.find(i => i.uid === uid);
        if (!item?.lineId || !cartId) return;

        set({ isLoading: true });
        try {
          const result = await removeLineFromShopifyCart(cartId, item.lineId);
          if (result.success) {
            const newItems = get().items.filter(i => i.uid !== uid);
            newItems.length === 0 ? clearCart() : set({ items: newItems });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } catch (error) {
          console.error('Failed to remove item:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: () => set({ items: [], cartId: null, checkoutUrl: null }),
      getCheckoutUrl: () => get().checkoutUrl,

      syncCart: async () => {
        const { cartId, isSyncing, clearCart } = get();
        if (!cartId || isSyncing) return;

        set({ isSyncing: true });
        try {
          const data = await storefrontApiRequest(CART_QUERY, { id: cartId });
          if (!data) return;
          const cart = data?.data?.cart;
          if (!cart || cart.totalQuantity === 0) clearCart();
        } catch (error) {
          console.error('Failed to sync cart:', error);
        } finally {
          set({ isSyncing: false });
        }
      }
    }),
    {
      name: 'shopify-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, cartId: state.cartId, checkoutUrl: state.checkoutUrl }),
    }
  )
);
