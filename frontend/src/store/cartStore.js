/**
 * store/cartStore.js
 * Zustand cart — persisted to localStorage (survives QR re-scan)
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCartStore = create(
  persist(
    (set, get) => ({
      items:           [],
      orderType:       "pickup",
      tableNumber:     "",
      offerId:         null,
      branchId:        null,
      spinDiscountPct: 0,   // % discount won from spin wheel (0 = none)

      addItem: (item, quantity = 1, customisations = [], specialInstructions = "") => {
        set(state => {
          const key   = item.id + JSON.stringify(customisations);
          const extra = customisations.reduce((s, c) => s + parseFloat(c.extra_price || 0), 0);
          // Use discounted_price if available (item's own discount),
          // else offer_price from active offer, else base price
          const baseSellingPrice = item.discounted_price && Number(item.discounted_price) < Number(item.price)
            ? parseFloat(item.discounted_price)
            : parseFloat(item.offer_price || item.price);
          const price = baseSellingPrice + extra;
          const existing = state.items.find(i => i._key === key);
          if (existing) {
            return { items: state.items.map(i => i._key === key
              ? { ...i, quantity: i.quantity + quantity, lineTotal: (i.quantity + quantity) * price }
              : i) };
          }
          return { items: [...state.items, {
            _key: key, id: item.id, slug: item.slug, name: item.name,
            price, basePrice: parseFloat(item.price),
            originalPrice: parseFloat(item.price),
            discountedPrice: parseFloat(item.discounted_price || item.price),
            imageUrl: item.image_url || null, dietaryType: item.dietary_type,
            stock_remaining: item.stock_remaining ?? null,
            quantity, customisations, specialInstructions,
            lineTotal: quantity * price,
          }]};
        });
      },

      removeItem: key => set(s => ({ items: s.items.filter(i => i._key !== key) })),

      updateQuantity: (key, quantity) => {
        if (quantity <= 0) { get().removeItem(key); return; }
        set(s => ({ items: s.items.map(i => i._key === key
          ? { ...i, quantity, lineTotal: quantity * i.price } : i) }));
      },

      clearCart:        () => set({ items: [], offerId: null, spinDiscountPct: 0 }),
      setOrderType:     t   => set({ orderType: t }),
      setTableNumber:   n   => set({ tableNumber: n }),
      setOffer:         id  => set({ offerId: id }),
      setBranch:        id  => set({ branchId: id }),
      setSpinDiscount:  pct => set({ spinDiscountPct: pct }),

      buildOrderPayload: (loyaltyPtsUsed = 0, paymentMethod = "cash") => {
        const s = get();
        const branchId = s.branchId || localStorage.getItem("branch_id") || undefined;
        return {
          order_type:        s.orderType,
          table_number:      s.tableNumber ? parseInt(s.tableNumber) : undefined,
          offer_id:          s.offerId || undefined,
          branch_id:         branchId,
          loyalty_pts_used:  loyaltyPtsUsed > 0 ? loyaltyPtsUsed : undefined,
          payment_method:    paymentMethod,
          items: s.items.map(i => ({
            menu_item_id:         i.id,
            quantity:             i.quantity,
            customisations:       i.customisations,
            special_instructions: i.specialInstructions,
          })),
        };
      },
    }),
    { name: "knfc-cart-v2", version: 1 }
  )
);

export default useCartStore;
