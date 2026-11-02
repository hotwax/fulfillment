import { api, commonUtil, logger, translate } from "@common";
import { ref } from "vue";

// Packed shipments by ID, with the order name and customer the Dashboard's data documents don't carry.
export function usePackedOrders() {
  const loading = ref(false);
  const orders = ref<Record<string, any>>({});

  async function loadPackedOrders(shipmentIds: string[]) {
    if(!shipmentIds.length) {return;}
    loading.value = true;
    try {
      const resp = await api({ url: "poorti/shipments", method: "GET", params: { pageSize: shipmentIds.length, customParametersMap: { shipmentId: shipmentIds.join(","), shipmentId_op: "in" } } }) as any;
      if(commonUtil.hasError(resp)) {throw resp.data;}
      orders.value = Object.fromEntries((resp.data?.shipments ?? []).map((shipment: any) => [shipment.shipmentId, shipment]));
    } catch (error) {
      logger.error("Failed to get the packed orders", error);
      commonUtil.showToast(translate("Failed to get the packed orders"));
    }
    loading.value = false;
  }

  return { loading, orders, loadPackedOrders };
}
