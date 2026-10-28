import type { DbRow } from "@common/db";
import { type Ref, watch } from "vue";
import { useProductStore } from "@/store/product";

// The card helpers (images, identifiers, kit checks) still read the Pinia product cache. Synced products are merged in rather
// than replacing entries, so what other pages loaded onto a product (such as its kit components) stays.
export function useProductCacheBridge(productRows: Ref<DbRow[]>) {
  const pushedVersions = new Map<string, number>();

  watch(productRows, (rows) => {
    const changed = rows.filter((row) => pushedVersions.get(String(row.productId)) !== row.syncedAt);
    if(!changed.length) {return;}
    const productStore = useProductStore();
    productStore.addProductToCachedMultiple({ products: changed.map((row) => ({ ...productStore.getProduct(String(row.productId)), ...row })) });
    changed.forEach((row) => pushedVersions.set(String(row.productId), Number(row.syncedAt)));
  }, { immediate: true });
}
