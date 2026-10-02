import type { Entity } from "@common/db/schema/defineEntity";
import { canonicalKey, entityKeyOf } from "@common/db/storage/projection";
import type { DbRow } from "@common/db/types";

const sameValue = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

// Rewriting unchanged rows would bump `syncedAt` on every tick and make the whole queue look changed.
export function changedRows(fresh: DbRow[], existing: DbRow[], entity: Entity): DbRow[] {
  const existingByKey = new Map<string, DbRow>();
  for(const row of existing) {
    const key = entityKeyOf(row, entity);
    if(key !== undefined) {existingByKey.set(canonicalKey(key), row);}
  }

  return fresh.filter((row) => {
    const key = entityKeyOf(row, entity);
    const previous = key === undefined ? undefined : existingByKey.get(canonicalKey(key));

    return !previous || entity.fieldNames.some((field) => !sameValue(previous[field], row[field]));
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for(let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

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

// Every facility's oldest order first, then every facility's second, so the top of each Open list fills first.
export function hydrationOrder<T extends Record<string, unknown>>(orders: T[]): T[] {
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
