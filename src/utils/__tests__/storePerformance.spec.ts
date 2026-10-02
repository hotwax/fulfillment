import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { closingTime, fillRate, formatDuration, pickerPerformance } from "@/utils/storePerformance";

const today = DateTime.fromISO("2026-10-02T12:00:00");
const at = (time: string) => DateTime.fromISO(`2026-10-02T${time}`).toMillis();

describe("pickerPerformance", () => {
  const picklists = [
    // One row per shipment status, so shipment S1 appears twice.
    { shipmentId: "S1", primaryOrderId: "O1", partyId: "P1", firstName: "Swati", lastName: "Pandey", picklistDate: at("09:00"), statusId: "SHIPMENT_APPROVED" },
    { shipmentId: "S1", primaryOrderId: "O1", partyId: "P1", firstName: "Swati", lastName: "Pandey", picklistDate: at("09:00"), statusId: "SHIPMENT_PACKED" },
    { shipmentId: "S2", primaryOrderId: "O2", partyId: "P1", firstName: "Swati", lastName: "Pandey", picklistDate: at("09:30") },
    { shipmentId: "S3", primaryOrderId: "O3", partyId: "P2", groupName: "Brooklyn picking", picklistDate: at("10:00") },
    // Picked yesterday and packed today: counts as packed, not picked.
    { shipmentId: "S4", primaryOrderId: "O4", partyId: "P2", groupName: "Brooklyn picking", picklistDate: DateTime.fromISO("2026-10-01T17:00:00").toMillis() }
  ];
  const packed = [
    { shipmentId: "S1", statusDate: at("09:20") },
    { shipmentId: "S3", statusDate: at("10:05") },
    { shipmentId: "S4", statusDate: at("08:00") },
    { shipmentId: "S9", statusDate: at("11:00") }
  ];
  const rejections = [{ orderId: "O2" }, { orderId: "O2" }, { orderId: "O7" }];

  it("counts each shipment and order once, for whoever picked it", () => {
    const rows = pickerPerformance(picklists, packed, rejections, today);

    expect(rows).toEqual([
      { partyId: "P1", name: "Swati Pandey", picked: 2, packed: 1, rejected: 1, avgPackMs: 20 * 60 * 1000 },
      { partyId: "P2", name: "Brooklyn picking", picked: 1, packed: 2, rejected: 0, avgPackMs: (5 + 15 * 60) * 60 * 1000 / 2 },
      { partyId: "", name: "", picked: 0, packed: 1, rejected: 1, avgPackMs: undefined }
    ]);
  });
});

describe("store performance formatting", () => {
  it("shows no fill rate before anything is packed or rejected", () => {
    expect(fillRate(0, 0)).toBeUndefined();
    expect(fillRate(3, 1)).toBe(75);
  });

  it("formats a duration in its largest whole unit", () => {
    expect(formatDuration(undefined)).toBe("-");
    expect(formatDuration(90 * 1000)).toBe("1 minute");
    expect(formatDuration(5 * 60 * 60 * 1000 + 59 * 60 * 1000)).toBe("5 hours");
  });

  it("reads today's closing time from the store lookup document", () => {
    const store = { friday_close: "16:30:00" };

    expect(closingTime(store, today)?.toFormat("HH:mm")).toBe("16:30");
    expect(closingTime(store, today.plus({ days: 1 }))).toBeUndefined();
  });
});
