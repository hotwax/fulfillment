/**
 * Pure helpers shared by the fulfillment sync domains. Free of Dexie so they are unit-testable.
 */

import type { DbRow } from "@common/db/types";

/**
 * Fresh rows that are new or whose server record changed since it was stored.
 *
 * Unchanged rows are skipped on purpose: rewriting them would bump `syncedAt` on every tick,
 * wake every live query, and make the item and card layers treat the whole queue as changed.
 */
export function changedRows(fresh: DbRow[], existing: Map<string, DbRow>, keyField: string): DbRow[] {
  return fresh.filter((row) => {
    const previous = existing.get(String(row[keyField]));

    return !previous || JSON.stringify(previous.raw) !== JSON.stringify(row.raw);
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for(let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

/** Run `task` over `items` with at most `limit` in flight. A failing task does not stop the others. */
export async function runWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while(next < items.length) {
      const item = items[next++];
      try {
        await task(item);
      } catch (error) {
        console.warn("[db] fulfillment sync task failed:", error);
      }
    }
  });
  await Promise.all(lanes);
}

/**
 * Orders interleaved across facilities, each facility's oldest first: every facility's first
 * order, then every second order, and so on. The top of each facility's Open list fills first.
 */
export function hydrationOrder<T extends { facilityId?: unknown; orderDate?: unknown }>(orders: T[]): T[] {
  const byFacility = new Map<string, T[]>();
  for(const order of orders) {
    const facilityOrders = byFacility.get(String(order.facilityId)) ?? [];
    facilityOrders.push(order);
    byFacility.set(String(order.facilityId), facilityOrders);
  }

  const ranked: Array<{ order: T; rank: number }> = [];
  byFacility.forEach((facilityOrders) => {
    facilityOrders
      .sort((a, b) => (Number(a.orderDate) || 0) - (Number(b.orderDate) || 0))
      .forEach((order, rank) => ranked.push({ order, rank }));
  });

  return ranked
    .sort((a, b) => a.rank - b.rank || (Number(a.order.orderDate) || 0) - (Number(b.order.orderDate) || 0))
    .map(({ order }) => order);
}
