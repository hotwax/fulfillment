import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { TransferOrderService } from '@/services/TransferOrderService';
import { ProductService } from '@/services/ProductService';
import { StockService } from '@/services/StockService';
import { hasError, showToast } from '@/utils';
import { translate } from "@hotwax/dxp-components";
import logger from '@/logger';

/**
 * Sequential product addition queue to prevent API deadlocks.
 * 
 * Process:
 * 1. Products are added to queue via addProductToQueue()
 * 2. Queue processes items sequentially (one API call at a time)
 * 3. pendingProductIds tracks products being added for UI feedback
 * 4. Prevents duplicate additions and API conflicts
 * 
 * States:
 * - addQueue: Items waiting to be processed
 * - pendingProductIds: Products currently being added (for UI)
 * - isProcessing: Whether queue is actively processing items
 */

export function useProductQueue() {
  const store = useStore();
  
  const addQueue = ref([]) as any;
  const isProcessing = ref(false);
  const pendingProductIds = ref(new Set());
  let pendingItemsToast: any = null;
  
  const currentOrder = computed(() => store.getters['transferorder/getCurrent']);

  // Helper function to check if product is in order
  const isProductInOrder = (productId: string ) => {
    return currentOrder.value?.items?.some((item: any) => item.productId === productId);
  };

  // Helper function to check if product is being processed
  const isProductBeingProcessed = (productId: string ) => {
    return pendingProductIds.value.has(productId) || isProductInOrder(productId);
  };

  // Show pending items toast when bulk scanning
  const showPendingItemsToast = async () => {
    if (!pendingItemsToast) {
      pendingItemsToast = await showToast(translate('Adding items to the order'), { manualDismiss: true });
      await pendingItemsToast.present();
    }
  };

  // Hide pending items toast
  const hidePendingItemsToast = () => {
    if (pendingItemsToast) {
      pendingItemsToast.dismiss();
      pendingItemsToast = null;
    }
  };

  // Fetch product information for all items in the order
  const fetchProductInformation = async () => {
    try {
      const items = currentOrder.value.items;
      if(!items?.length) return;
      const productIds = items.map((item: any) => item.productId);
      if (productIds.length) await store.dispatch('product/fetchProducts', { productIds });
    } catch (err) {
      logger.error("Failed to fetch product information", err);
    }
  };
  
  /**
   * Adds product to queue for sequential processing.
   * Validates input, checks for duplicates, and triggers processing.
   */
  const addProductToQueue = (itemToAdd: any) => {
    const { product } = itemToAdd;
    
    if (!product?.productId || !itemToAdd.orderId) {
      logger.error('Missing product data or orderId');
      return;
    }
    
    // Skip if already in order or being processed
    if (isProductBeingProcessed(product.productId)) {
      return;
    }
    
    pendingProductIds.value.add(product.productId);
    addQueue.value.push(itemToAdd);

    // Show toast only when pending items are 2 or more
    if (pendingProductIds.value.size >= 2) showPendingItemsToast();
    processQueue();
  };

  /**
   * Processes product queue sequentially to prevent API deadlocks.
   * Handles one item at a time, continues on failures.
   */
  const processQueue = async () => {
    if (isProcessing.value || addQueue.value.length === 0) return;
    
    isProcessing.value = true;
    
    while (addQueue.value.length > 0) {
      const itemToAdd = addQueue.value[0];

      await processSingleProduct(itemToAdd);
      addQueue.value.shift();
    }
    
    isProcessing.value = false;
    hidePendingItemsToast();
    if (pendingProductIds.value.size === 0) await fetchProductInformation();
  };
  
  /**
   * Processes single product addition with error handling.
   * Fetches stock, cost, calls API, updates store, and handles UI feedback.
   */
  const processSingleProduct = async (itemToAdd: any) => {
    const { product, orderId, facilityId, scannedId, onSuccess } = itemToAdd;
    
    const newItem = {
      productId: product.productId,
      sku: product.sku,
      quantity: 1,
      pickedQuantity: 1,
      shipGroupSeqId: "00001",
      scannedId: scannedId
    } as any;

    if (facilityId) {
      const stock = await fetchStock(product.productId, facilityId);
      if (stock) newItem.qoh = stock.qoh || 0;
    }

    try {
      const unitPrice = facilityId ? 
        await ProductService.fetchProductAverageCost(product.productId, facilityId) : 0;

      const payload = {
        orderId,
        productId: product.productId,
        quantity: newItem.quantity,
        shipGroupSeqId: newItem.shipGroupSeqId,
        unitPrice: unitPrice || 0
      };
      
      const resp = await TransferOrderService.addOrderItem(payload);

      if (!hasError(resp)) {
        newItem.orderId = orderId;
        newItem.orderItemSeqId = resp.data?.orderItemSeqId;

        const updatedOrder = {
          ...currentOrder.value,
          items: [...currentOrder.value.items, newItem]
        };
        
        await store.dispatch('transferorder/updateCurrentTransferOrder', updatedOrder);
        onSuccess?.(product, newItem);
      } else {
        throw resp.data;
      }
    } catch (err) {
      itemToAdd.onError?.(product, err);
      showToast(translate("Failed to add product to order"));
    } finally {
      pendingProductIds.value.delete(product.productId);
    }
  };

  const fetchStock = async (productId: string, facilityId: string) => {
    if (!facilityId) return null;
    
    try {
      const resp = await StockService.getInventoryAvailableByFacility({ 
        productId, 
        facilityId 
      });
      if (!hasError(resp)) return resp.data;
    } catch (err) {
      logger.error(err);
    }
    return null;
  };

  const clearQueue = () => {
    addQueue.value = [];
    pendingProductIds.value.clear();
    hidePendingItemsToast();
  };

  return {
    addProductToQueue,
    clearQueue,
    fetchProductInformation,
    pendingProductIds,
    isProductInOrder
  };
}