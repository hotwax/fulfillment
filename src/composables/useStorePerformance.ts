import { api, commonUtil, logger, translate } from "@common";
import { DateTime } from "luxon";
import { computed, ref } from "vue";
import { useProductStore } from "@/store/productStore";
import { closingTime, fillRate, pickerPerformance } from "@/utils/storePerformance";

const distinct = (rows: any[], field: string) => new Set(rows.map((row) => row[field]));

async function dataDocumentRows(dataDocumentId: string, customParametersMap: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<any[]> {
  const resp = await api({ url: "oms/dataDocumentView", method: "POST", data: { dataDocumentId, customParametersMap: { pageNoLimit: true, ...customParametersMap }, ...options } }) as any;
  if(commonUtil.hasError(resp)) {throw resp.data;}

  return resp.data?.entityValueList ?? [];
}

// Today's numbers for the current facility. The data documents are defined in hotwax-poorti, and ORDER_FACILITY_CHANGE in oms.
export function useStorePerformance() {
  const productStore = useProductStore();
  const loading = ref(false);
  const now = ref(DateTime.now());
  const performance = ref({ allocated: [] as any[], packed: [] as any[], rejected: [] as any[], pending: [] as any[], picklists: [] as any[], store: undefined as any });
  let latestLoad = 0;

  const allocatedCount = computed(() => distinct(performance.value.allocated, "orderId").size);
  const packedCount = computed(() => distinct(performance.value.packed, "shipmentId").size);
  const rejectedCount = computed(() => distinct(performance.value.rejected, "orderId").size);
  const rate = computed(() => (loading.value ? undefined : fillRate(packedCount.value, rejectedCount.value)));
  const openOrderIds = computed(() => distinct(performance.value.pending.filter((item) => !item.shipmentId), "orderId"));
  const inProgressOrderIds = computed(() => distinct(performance.value.pending.filter((item) => item.shipmentStatus === "SHIPMENT_APPROVED"), "orderId"));
  const oldestPending = computed(() => {
    const reserved = performance.value.pending.map((item) => item.reservedDatetime).filter(Boolean);

    return reserved.length ? DateTime.fromMillis(Math.min(...reserved)).toRelative() : "";
  });
  const closesAt = computed(() => closingTime(performance.value.store, now.value));
  const pickers = computed(() => pickerPerformance(performance.value.picklists, performance.value.packed, performance.value.rejected, now.value));
  const mostPicked = computed(() => pickers.value.find((picker) => picker.partyId && picker.picked));
  const fastestPacker = computed(() => pickers.value
    .filter((picker) => picker.partyId && picker.avgPackMs !== undefined)
    .sort((a, b) => a.avgPackMs! - b.avgPackMs!)[0]);
  // Widths of the progress bar's layers, against the facility's order limit. Each layer starts at the left edge,
  // so the rejected layer covers packed and rejected, and the allocated layer everything allocated.
  const progress = computed(() => {
    const handled = packedCount.value + rejectedCount.value;
    const total = Math.max(Number(productStore.getCurrentFacility?.maximumOrderLimit) || 0, allocatedCount.value, handled);
    const width = (count: number) => `${total ? count / total * 100 : 0}%`;

    return { packed: width(packedCount.value), handled: width(handled), allocated: width(Math.max(allocatedCount.value, handled)) };
  });

  async function loadPerformance() {
    const facilityId = productStore.getCurrentFacility?.facilityId;
    if(!facilityId) {return;}

    const load = ++latestLoad;
    loading.value = true;
    now.value = DateTime.now();
    const today = now.value.startOf("day").toFormat("yyyy-MM-dd");
    const productStoreId = productStore.getCurrentProductStore?.productStoreId;
    // Store pickup orders are fulfilled in the BOPIS app.
    const shipping = { shipmentMethodTypeId: "STOREPICKUP", shipmentMethodTypeId_not: "Y", productStoreId };

    try {
      const [allocated, rejected, packed, pending, picklists, store] = await Promise.all([
        dataDocumentRows("ORDER_FACILITY_CHANGE", { ...shipping, facilityId, changeDatetime_from: today }, { fieldsToSelect: "orderId", distinct: true }),
        dataDocumentRows("ORDER_FACILITY_CHANGE", { ...shipping, fromFacilityId: facilityId, facilityId: "REJECTED_ITM_PARKING", changeDatetime_from: today }),
        dataDocumentRows("SHIPMENT_AND_STATUS", { ...shipping, facilityId, shipmentTypeId: "SALES_SHIPMENT", statusId: "SHIPMENT_PACKED", statusDate_from: today }, { distinct: true }),
        dataDocumentRows("ORDER_HEADER_ITEM_SHIP_GROUP_SHIPMENT", {
          ...shipping,
          facilityId,
          orderTypeId: "SALES_ORDER",
          orderStatusId: "ORDER_APPROVED",
          itemStatusId: "ITEM_CANCELLED",
          itemStatusId_not: "Y",
          shipmentStatus: "SHIPMENT_PACKED,SHIPMENT_SHIPPED,SHIPMENT_CANCELLED,SHIPMENT_INPUT",
          shipmentStatus_op: "in",
          shipmentStatus_not: "Y"
        }),
        dataDocumentRows("SHIPMENT_AND_PICKLIST_AND_ROLE", { productStoreId, originFacilityId: facilityId, statusId: "SHIPMENT_APPROVED,SHIPMENT_PACKED", statusId_op: "in", partyId_op: "empty", partyId_not: "Y", picklistDate_from: today }),
        // Only the closing time needs it, so an instance without the store lookup still shows the rest.
        api({ url: "api/stores", method: "POST", data: { viewSize: 1, filters: [`storeCode: ${facilityId}`] } }).then((resp: any) => resp.data?.docs?.[0]).catch(() => undefined)
      ]);

      // What was packed or rejected today can have been picked on an earlier day.
      const shipmentIds = [...distinct(packed, "shipmentId")].filter((shipmentId) => !picklists.some((row) => row.shipmentId === shipmentId));
      const orderIds = [...distinct(rejected, "orderId")].filter((orderId) => !picklists.some((row) => row.primaryOrderId === orderId));
      const earlierPicklists = await Promise.all([
        shipmentIds.length ? dataDocumentRows("SHIPMENT_AND_PICKLIST_AND_ROLE", { shipmentId: shipmentIds.join(","), shipmentId_op: "in" }) : [],
        orderIds.length ? dataDocumentRows("SHIPMENT_AND_PICKLIST_AND_ROLE", { primaryOrderId: orderIds.join(","), primaryOrderId_op: "in" }) : []
      ]);

      if(load === latestLoad) {performance.value = { allocated, packed, rejected, pending, picklists: [...picklists, ...earlierPicklists.flat()], store };}
    } catch (error) {
      logger.error("Failed to get today's store performance", error);
      commonUtil.showToast(translate("Failed to get today's store performance"));
    }
    if(load === latestLoad) {loading.value = false;}
  }

  return { loading, now, allocatedCount, packedCount, rejectedCount, rate, openOrderIds, inProgressOrderIds, oldestPending, closesAt, pickers, mostPicked, fastestPacker, progress, loadPerformance };
}
