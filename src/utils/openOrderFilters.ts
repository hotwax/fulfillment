/**
 * Filter dimensions for the Open page.
 *
 * The filter engine and the Settings toggles both read this registry, so adding a dimension is
 * one entry here plus its label in the locale files. Everything below is pure, for unit tests.
 */

export interface OpenOrderFilterDimension {
  id: string;
  /** Translation key shown in Settings and above the dimension's filters. */
  label: string;
  /** The values an order has for this dimension. */
  valuesOf: (order: any, productsById: Map<string, any>) => string[];
}

export interface FacetValue {
  value: string;
  orderCount: number;
  itemCount: number;
}

/** Selected values per dimension id. Values within a dimension combine with OR, dimensions with AND. */
export type FilterSelections = Record<string, string[]>;

const unique = (values: unknown[]): string[] =>
  [...new Set(values.filter((value) => value !== undefined && value !== null && value !== "").map(String))];

const productValues = (order: any, productsById: Map<string, any>, field: string): string[] =>
  unique((order.items ?? []).flatMap((item: any) => productsById.get(item.productId)?.[field] ?? []));

export const OPEN_ORDER_FILTER_DIMENSIONS: OpenOrderFilterDimension[] = [
  {
    id: "shipmentMethod",
    label: "Shipping method",
    valuesOf: (order) => unique([order.shipmentMethodTypeId])
  },
  {
    id: "productTag",
    label: "Product tags",
    valuesOf: (order, productsById) => productValues(order, productsById, "tags")
  },
  {
    id: "productCategory",
    label: "Product categories",
    valuesOf: (order, productsById) => productValues(order, productsById, "productCategories")
  }
];

export const DEFAULT_OPEN_ORDER_FILTER_DIMENSIONS = ["shipmentMethod"];

/** Order name, order ID, customer name, and each item's product ID, names and identifiers. */
export function matchesSearch(order: any, productsById: Map<string, any>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if(!needle) {return true;}

  const haystack: unknown[] = [order.orderName, order.orderId, order.customerName];
  for(const item of order.items ?? []) {
    const product = productsById.get(item.productId);
    haystack.push(item.productId, product?.productName, product?.parentProductName, product?.internalName);
    if(Array.isArray(product?.goodIdentifications)) {haystack.push(...product.goodIdentifications);}
  }

  return haystack.some((value) => value !== undefined && value !== null && String(value).toLowerCase().includes(needle));
}

interface FilterOptions {
  dimensions: OpenOrderFilterDimension[];
  selections: FilterSelections;
  productsById: Map<string, any>;
  query: string;
}

function matchesSelections(order: any, options: FilterOptions, skipDimensionId?: string): boolean {
  return options.dimensions.every((dimension) => {
    if(dimension.id === skipDimensionId) {return true;}
    const selected = options.selections[dimension.id] ?? [];
    if(!selected.length) {return true;}
    const values = dimension.valuesOf(order, options.productsById);

    return selected.some((value) => values.includes(value));
  });
}

export function filterOpenOrders(orders: any[], options: FilterOptions): any[] {
  return orders.filter((order) => matchesSearch(order, options.productsById, options.query) && matchesSelections(order, options));
}

/**
 * Values and counts for each dimension. A dimension's counts honor the search and every OTHER
 * dimension's selections, so each count says how many orders tapping that value would show.
 * Selected values stay listed even at zero, so a selection can always be undone.
 */
export function openOrderFacets(orders: any[], options: FilterOptions): Record<string, FacetValue[]> {
  const searched = orders.filter((order) => matchesSearch(order, options.productsById, options.query));
  const facets: Record<string, FacetValue[]> = {};

  for(const dimension of options.dimensions) {
    const counts = new Map<string, FacetValue>();
    for(const value of options.selections[dimension.id] ?? []) {counts.set(value, { value, orderCount: 0, itemCount: 0 });}

    for(const order of searched) {
      if(!matchesSelections(order, options, dimension.id)) {continue;}
      for(const value of dimension.valuesOf(order, options.productsById)) {
        const facet = counts.get(value) ?? { value, orderCount: 0, itemCount: 0 };
        facet.orderCount += 1;
        facet.itemCount += (order.items ?? []).length;
        counts.set(value, facet);
      }
    }
    // Alphabetical, so chips keep their place while counts change.
    facets[dimension.id] = [...counts.values()].sort((a, b) => a.value.localeCompare(b.value));
  }

  return facets;
}
