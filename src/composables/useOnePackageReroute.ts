import { api, commonUtil, emitter, logger, translate } from "@common";
import { reactive } from "vue";
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/productStore";
import {
  type OrderFacilityChange,
  type ShipGroupItem,
  type ShippingInventoryProduct,
  type SplitDecision,
  buildWholeOrderRejections,
  completeFacilities,
  facilitiesThatRejected,
  itemsUnavailableElsewhere,
  requiredQuantities,
  splitDecision,
  unitCount
} from "@/utils/onePackageReroute";
import { orderUtil } from "@/utils/orderUtil";

// After this the card falls back to the usual partial rejection.
const CHECK_TIMEOUT_MS = 4000;
const CHECK_TTL_MS = 5 * 60 * 1000;

interface StockCheck {
  status: "checking" | "ready" | "failed";
  checkedAt: number;
  orderId: string;
  fromFacilityId: string;
  // Every approved item of the ship group, not only the shipment's.
  items: ShipGroupItem[];
  completeFacilityIds: string[];
  unavailableElsewhere: string[];
}

type RejectionOutcome = SplitDecision | "checking" | "unchecked";

// Keyed by shipment and shared, so In Progress and Order detail show the same check.
const stockChecks = reactive<Record<string, StockCheck>>({});
const pendingChecks = new Map<string, Promise<StockCheck>>();

const withTimeout = <T>(promise: Promise<T>, ms: number) => Promise.race([
  promise,
  new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))
]);

const listFrom = (resp: any): any[] => {
  if(commonUtil.hasError(resp)) {throw resp.data;}

  return Array.isArray(resp.data) ? resp.data : [];
};

const fetchShipGroupItems = async (orderId: string, shipGroupSeqId: string): Promise<ShipGroupItem[]> => {
  const resp = await api({
    url: `oms/orders/${orderId}/items`,
    method: "GET",
    params: { shipGroupSeqId, statusId: "ITEM_APPROVED", pageSize: 250 }
  });

  return listFrom(resp)
    .filter((item) => item.shipGroupSeqId === shipGroupSeqId && item.statusId === "ITEM_APPROVED")
    .map((item) => ({
      orderItemSeqId: item.orderItemSeqId,
      productId: item.productId,
      quantity: (Number(item.quantity) || 0) - (Number(item.cancelQuantity) || 0)
    }));
};

const fetchFacilityChanges = async (orderId: string): Promise<OrderFacilityChange[]> => {
  const resp = await api({
    url: `oms/orders/${orderId}/facilityChange`,
    method: "GET",
    params: { pageSize: 250 }
  });

  return listFrom(resp);
};

const fetchShippingInventory = async (productStoreId: string, productIds: string[]): Promise<ShippingInventoryProduct[]> => {
  const resp = await api({
    url: "ofbiz-oms-usl/checkShippingInventory",
    method: "POST",
    data: { productStoreId, productIds }
  }) as any;
  if(commonUtil.hasError(resp)) {throw resp.data;}

  return resp.data?.resultList ?? [];
};

export function useOnePackageReroute() {
  const productStore = useProductStore();

  // Kits are left out: their stock is on the components, and the inventory check reads the kit product.
  const checkContext = (order: any) => {
    const items = order?.items ?? [];
    if(!order?.hasRejectedItem || order.shipmentMethodTypeId === "STOREPICKUP" || !items.length) {return undefined;}
    if(items.some((item: any) => orderUtil.isKit(item))) {return undefined;}

    const context = {
      key: String(order.shipmentId ?? ""),
      orderId: order.orderId as string,
      shipGroupSeqId: (items.find((item: any) => item.shipGroupSeqId)?.shipGroupSeqId ?? order.primaryShipGroupSeqId) as string,
      productStoreId: (order.productStoreId ?? productStore.getCurrentProductStore?.productStoreId) as string,
      fromFacilityId: (order.originFacilityId ?? productStore.getCurrentFacility?.facilityId) as string
    };

    return Object.values(context).every(Boolean) ? context : undefined;
  };

  type CheckContext = NonNullable<ReturnType<typeof checkContext>>;

  const emptyCheck = (context: CheckContext, status: StockCheck["status"]): StockCheck => ({
    status,
    checkedAt: Date.now(),
    orderId: context.orderId,
    fromFacilityId: context.fromFacilityId,
    items: [],
    completeFacilityIds: [],
    unavailableElsewhere: []
  });

  const runCheck = async (context: CheckContext): Promise<StockCheck> => {
    const [items, changes] = await Promise.all([fetchShipGroupItems(context.orderId, context.shipGroupSeqId), fetchFacilityChanges(context.orderId)]);
    const required = requiredQuantities(items);
    const products = required.size ? await fetchShippingInventory(context.productStoreId, [...required.keys()]) : [];
    // The rejecting store and stores that already rejected these items don't count.
    const excluded = [context.fromFacilityId, ...facilitiesThatRejected(changes, items.map((item) => item.orderItemSeqId))];

    return {
      ...emptyCheck(context, "ready"),
      items,
      completeFacilityIds: completeFacilities(products, required, excluded),
      unavailableElsewhere: itemsUnavailableElsewhere(products, items, excluded)
    };
  };

  const startStockCheck = (order: any): Promise<StockCheck | undefined> => {
    const context = checkContext(order);
    if(!context) {return Promise.resolve(undefined);}

    const current = stockChecks[context.key];
    if(current?.status === "ready" && Date.now() - current.checkedAt < CHECK_TTL_MS) {return Promise.resolve(current);}
    const pending = pendingChecks.get(context.key);
    if(pending) {return pending;}

    stockChecks[context.key] = emptyCheck(context, "checking");
    const check = withTimeout(runCheck(context), CHECK_TIMEOUT_MS)
      .then((result) => result ?? emptyCheck(context, "failed"))
      .catch((error) => {
        logger.error("Failed to check other locations for the order", error);

        return emptyCheck(context, "failed");
      })
      .then((result) => {
        stockChecks[context.key] = result;
        pendingChecks.delete(context.key);

        return result;
      });
    pendingChecks.set(context.key, check);

    return check;
  };

  // A failed check stays failed, so reporting does what the card said.
  const resolveStockCheck = (order: any) => {
    const context = checkContext(order);
    const current = context && stockChecks[context.key];

    return current?.status === "failed" ? Promise.resolve(current) : startStockCheck(order);
  };

  const stockCheckFor = (order: any) => {
    const context = checkContext(order);

    return context ? stockChecks[context.key] : undefined;
  };

  const rejectionOutcome = (order: any): RejectionOutcome | undefined => {
    const check = stockCheckFor(order);
    if(!check) {return undefined;}

    const shipmentItems = order.items ?? [];
    const decision = splitDecision({
      partialRejections: productStore.isProductStoreSettingEnabled("FULFILL_PART_ODR_REJ"),
      shipGroupUnits: unitCount(check.status === "ready" ? check.items : shipmentItems),
      pickedUnits: unitCount(shipmentItems.filter((item: any) => !item.rejectReason)),
      completeLocations: check.completeFacilityIds.length
    });
    if(!decision) {return undefined;}
    if(check.status === "checking") {return "checking";}
    if(check.status === "failed") {return "unchecked";}

    return decision;
  };

  const rejectionNote = (order: any) => {
    const outcome = rejectionOutcome(order);
    const count = stockCheckFor(order)?.completeFacilityIds.length ?? 0;

    if(outcome === "whole") {return translate("The entire order will be rejected. other locations have every item.", { count });}
    if(outcome === "partial") {
      return translate(count ? "Fulfill what you have. Only 1 other location has every item." : "Fulfill what you have. No other location has every item.");
    }
    if(outcome === "unchecked") {return translate("Couldn't check other locations. Only the rejected items will be unassigned.");}

    return "";
  };

  const isUnavailableElsewhere = (order: any, item: any) => {
    const check = stockCheckFor(order);

    return check?.status === "ready" && check.unavailableElsewhere.includes(String(item.orderItemSeqId));
  };

  const wholeOrderMessage = (order: any, itemsToReject: any[], collateralOrderCount = 0) => {
    const productName = itemsToReject[0]?.productName;
    const pickedCount = unitCount((order.items ?? []).filter((item: any) => !item.rejectReason));

    const sentences = [
      itemsToReject.length > 1
        ? translate(", and other products are identified as unfulfillable.", { productName, products: itemsToReject.length - 1 })
        : translate("is identified as unfulfillable.", { productName }),
      translate("other locations have every item in this order in stock. The whole order will be unassigned from this store and sent to be rebrokered so it ships in one package.", { count: stockCheckFor(order)?.completeFacilityIds.length ?? 0 })
    ];
    if(pickedCount) {
      sentences.push(translate("Put the picked items back on the shelf.", { count: pickedCount, itemText: translate(pickedCount > 1 ? "items" : "item") }));
    }
    if(collateralOrderCount) {
      const collateralKey = itemsToReject.length > 1
        ? "other containing these products will be unassigned from this store and sent to be rebrokered."
        : "other containing this product will be unassigned from this store and sent to be rebrokered.";
      sentences.push(translate(collateralKey, { orders: collateralOrderCount, orderText: translate(collateralOrderCount > 1 ? "orders" : "order") }));
    }

    return sentences.join("<br /><br />");
  };

  const rejectWholeOrder = async (order: any, rejectedOrderItems: any[]) => {
    const context = checkContext(order);
    const check = stockCheckFor(order);
    if(!context || !check) {return false;}

    emitter.emit("presentLoader");
    try {
      const resp = await useOrderStore().packOrder({
        shipmentId: order.shipmentId,
        orderId: check.orderId,
        facilityId: check.fromFacilityId,
        rejectedOrderItems: buildWholeOrderRejections(rejectedOrderItems, check.items, order.items)
      }) as any;
      if(commonUtil.hasError(resp)) {throw resp.data;}
      delete stockChecks[context.key];
      commonUtil.showToast(translate("Order rejected successfully"));

      return true;
    } catch (error) {
      logger.error("Failed to reject order", error);
      commonUtil.showToast(translate("Failed to reject order"));

      return false;
    } finally {
      emitter.emit("dismissLoader");
    }
  };

  return {
    startStockCheck,
    resolveStockCheck,
    rejectionOutcome,
    rejectionNote,
    isUnavailableElsewhere,
    wholeOrderMessage,
    rejectWholeOrder
  };
}
