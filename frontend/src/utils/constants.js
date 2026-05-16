/**
 * utils/constants.js
 */
export const APP_NAME   = "KNFC";
export const BRAND      = "#E8521A";

export const ORDER_STATUS = {
  PLACED:    "placed",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY:     "ready",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const STATUS_META = {
  placed:    { label:"Order placed",      color:"var(--info)",  step:0 },
  confirmed: { label:"Confirmed",         color:"var(--ok)",    step:1 },
  preparing: { label:"Preparing",         color:"var(--warn)",  step:2 },
  ready:     { label:"Ready to collect!", color:"var(--brand)", step:3 },
  completed: { label:"Completed",         color:"var(--t3)",    step:4 },
  cancelled: { label:"Cancelled",         color:"var(--err)",   step:-1 },
};

export const DIETARY_DOT = {
  veg:     { color:"#00a550", border:"#00a550", label:"Veg",     symbol:"▲" },
  non_veg: { color:"#e8392a", border:"#e8392a", label:"Non-veg", symbol:"▲" },
  vegan:   { color:"#00a550", border:"#00a550", label:"Vegan",   symbol:"▲" },
};

export const SPICE_DOTS = { mild:1, medium:2, hot:3, extra:4 };

export const SORT_OPTIONS = [
  { value:"popular",    label:"Most popular"       },
  { value:"price_asc",  label:"Price: low to high" },
  { value:"price_desc", label:"Price: high to low" },
  { value:"new",        label:"New arrivals"       },
  { value:"rating",     label:"Top rated"          },
];
