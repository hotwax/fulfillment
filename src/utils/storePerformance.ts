import { DateTime, Duration } from "luxon";

export interface PackedShipment {
  shipmentId: string;
  orderId: string;
  packedDate: number;
}

export interface PickerPerformance {
  // Empty for work that was on no picklist.
  partyId: string;
  name: string;
  picked: number;
  packed: number;
  // The shipments counted in `packed`.
  packedShipments: PackedShipment[];
  rejected: number;
  // From the picklist to the shipment being packed.
  avgPackMs?: number;
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const pickerName = (row: any) => row.groupName || [row.firstName, row.lastName].filter(Boolean).join(" ") || row.partyId;

export const fillRate = (packed: number, rejected: number) => (packed + rejected ? Math.round(packed / (packed + rejected) * 100) : undefined);

// Picklist rows repeat per shipment status, so everything is counted by shipment or order ID. Shipments packed
// and orders rejected today count for whoever picked them.
export function pickerPerformance(picklistRows: any[], packedShipments: any[], rejections: any[], today: DateTime = DateTime.now()): PickerPerformance[] {
  const picklistByShipment = new Map<string, any>();
  const picklistByOrder = new Map<string, any>();
  for(const row of picklistRows) {
    if(!picklistByShipment.has(row.shipmentId)) {picklistByShipment.set(row.shipmentId, row);}
    if(!picklistByOrder.has(row.primaryOrderId)) {picklistByOrder.set(row.primaryOrderId, row);}
  }

  const stats = new Map<string, { partyId: string; name: string; picked: Set<string>; packed: Set<string>; packedShipments: PackedShipment[]; rejected: Set<string>; packMs: number[] }>();
  const statsFor = (picklist?: any) => {
    const partyId = picklist?.partyId ?? "";
    if(!stats.has(partyId)) {stats.set(partyId, { partyId, name: picklist ? pickerName(picklist) : "", picked: new Set(), packed: new Set(), packedShipments: [], rejected: new Set(), packMs: [] });}

    return stats.get(partyId)!;
  };

  for(const row of picklistRows) {
    if(DateTime.fromMillis(Number(row.picklistDate)).hasSame(today, "day")) {statsFor(row).picked.add(row.shipmentId);}
  }
  for(const shipment of packedShipments) {
    const picklist = picklistByShipment.get(shipment.shipmentId);
    const entry = statsFor(picklist);
    if(entry.packed.has(shipment.shipmentId)) {continue;}
    entry.packed.add(shipment.shipmentId);
    entry.packedShipments.push({ shipmentId: shipment.shipmentId, orderId: shipment.primaryOrderId, packedDate: Number(shipment.statusDate) });
    if(picklist && shipment.statusDate > picklist.picklistDate) {entry.packMs.push(shipment.statusDate - picklist.picklistDate);}
  }
  for(const rejection of rejections) {statsFor(picklistByOrder.get(rejection.orderId)).rejected.add(rejection.orderId);}

  return [...stats.values()]
    .map(({ partyId, name, picked, packed, packedShipments, rejected, packMs }) => ({
      partyId,
      name,
      picked: picked.size,
      packed: packed.size,
      packedShipments,
      rejected: rejected.size,
      avgPackMs: packMs.length ? packMs.reduce((total, ms) => total + ms, 0) / packMs.length : undefined
    }))
    // People first, by orders picked; work on no picklist last.
    .sort((a, b) => Number(!a.partyId) - Number(!b.partyId) || b.picked - a.picked || b.packed - a.packed);
}

// The largest whole unit, like "5 minutes".
export function formatDuration(ms?: number): string {
  if(!ms) {return "-";}
  const duration = Duration.fromMillis(ms).shiftTo("days", "hours", "minutes", "seconds");
  const unit = (["days", "hours", "minutes"] as const).find((name) => duration.get(name) >= 1) ?? "seconds";

  return Duration.fromObject({ [unit]: Math.floor(duration.get(unit)) }).toHuman();
}

// The store lookup document keeps each day's hours, like `monday_close: "16:30:00"`.
export function closingTime(store: any, now: DateTime = DateTime.now()): DateTime | undefined {
  const time = store?.[`${WEEKDAYS[now.weekday - 1]}_close`];
  if(!time) {return undefined;}
  const [hour, minute] = String(time).split(":").map(Number);

  return now.set({ hour, minute, second: 0, millisecond: 0 });
}
