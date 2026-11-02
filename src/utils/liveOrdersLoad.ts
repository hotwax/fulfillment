export interface LiveOrdersLoad {
  // Whether the facility's orders, their items and their products are all in.
  loaded: boolean;
  // From 0 to 1, once the facility's orders are known.
  progress?: number;
}

// Items, then products: an order joins the Open page once its items are in, and its rows fill once their products are.
// Loaded once everything is in, or once the worker has finished the facility's own items and products pass, so an
// order or product the server can't fill doesn't keep the page loading.
export function liveOrdersLoad(state: { synced: boolean; facilityPassed: boolean; orders: number; ordersWithItems: number; products: number; productsLoaded: number }): LiveOrdersLoad {
  if(!state.synced) {return { loaded: false };}
  const itemsShare = state.orders ? Math.min(state.ordersWithItems / state.orders, 1) : 1;
  const productsShare = state.products ? Math.min(state.productsLoaded / state.products, 1) : 1;
  if(state.facilityPassed || (itemsShare === 1 && productsShare === 1)) {return { loaded: true, progress: 1 };}

  return { loaded: false, progress: itemsShare < 1 ? itemsShare / 2 : 0.5 + productsShare / 2 };
}
