import { ref, watch, computed } from 'vue';
import { useStore } from 'vuex';
import { TransferOrderService } from '@/services/TransferOrderService';
import { ProductService } from '@/services/ProductService';
import { StockService } from '@/services/StockService';
import { hasError, showToast } from '@/utils';
import { translate } from "@hotwax/dxp-components";
import logger from '@/logger';

export function useProductQueue() {
  const store = useStore();
  
  const addQueue = ref([]) as any;
  const isProcessing = ref(false);
  const pendingProductIds = ref(new Set());
  
  const currentOrder = computed(() => store.getters['transferorder/getCurrent']);

  // Helper function to check if product is in order
  const isProductInOrder = (productId: string ) => {
    return currentOrder.value?.items?.some((item: any) => item.productId === productId);
  };

  // Helper function to check if product is being processed
  const isProductBeingProcessed = (productId: string ) => {
    return pendingProductIds.value.has(productId) || isProductInOrder(productId);
  };

  // watch(addQueue.length, (newQueue) => {
  //   if (newQueue.length > 0 && !isProcessing.value) {
  //     processQueue();
  //   }
  // });

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
    
    addQueue.value.push({
      ...itemToAdd,
      scannedId: itemToAdd.scannedId
    });
    processQueue();
  };

  const processQueue = async () => {
    if (isProcessing.value || addQueue.value.length === 0) return;
    
    isProcessing.value = true;
    
    while (addQueue.value.length > 0) {
      const itemToAdd = addQueue.value[0];
      
      try {
        await processSingleProduct(itemToAdd);
        addQueue.value.shift();
      } catch (error) {
        addQueue.value.shift();
        pendingProductIds.value.delete(itemToAdd.product.productId);
        itemToAdd.onError?.(itemToAdd.product, error);
        logger.error('Failed to add product:', error);
      }
    }
    
    isProcessing.value = false;
  };

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
        
        pendingProductIds.value.delete(product.productId);
        onSuccess?.(product, newItem);
        
      } else {
        throw resp.data;
      }
    } catch (err) {
      pendingProductIds.value.delete(product.productId);
      itemToAdd.onError?.(product, err);
      showToast(translate("Failed to add product to order"));
      throw err;
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
  };

  return {
    addProductToQueue,
    clearQueue,
    pendingProductIds,
    isProductInOrder
  };
}