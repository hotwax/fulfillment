import store from '@/store';
import { translate } from '@hotwax/dxp-components';
import { showToast } from '@/utils';
import { OrderService } from '@/services/OrderService';

const orderCategoryParameters = {
  'Open': {
    'quantityNotAvailable': {
      'value': 0
    },
    'isPicked': {
      'value': 'N'
    },
    'shipmentMethodTypeId': {
      'value': 'STOREPICKUP',
      'OP': 'NOT'
    },
    'fulfillmentStatus': {
      'value': 'Cancelled',
      'OP': 'NOT'
    },
    'orderStatusId': {
      'value': 'ORDER_APPROVED'
    },
    'orderTypeId': {
      'value': 'SALES_ORDER'
    }
  },
  'In Progress': {
    'picklistItemStatusId': {
      'value': 'PICKITEM_PENDING',
    },
    'shipmentMethodTypeId': {
      'value': 'STOREPICKUP',
      'OP': 'NOT'
    },
    'fulfillmentStatus': {
      'value': 'Rejected',
      'OP': 'NOT'
    },
  },
  'Completed': {
    // Array to denote ORing
    'picklistItemStatusId': {
      'value': ['PICKITEM_PICKED', 'PICKITEM_COMPLETED'],
      'OP': 'OR'
    },
    'shipmentMethodTypeId': {
      'value': 'STOREPICKUP',
      'OP': 'NOT'
    }
  }
}

const handleParameterMatching = (orderVal: any, parameterVal: any, operation?: string) => {
  // considering params will always be an Array for ORing and ANDing
  if (operation === 'OR') {
    return parameterVal.some((param: any) => orderVal === param)
  } else if (operation === 'AND') {
    return parameterVal.every((param: any) => orderVal === param)
  } else if (operation === 'NOT') {
    return orderVal !== parameterVal
  } else if (!operation) {
    return orderVal === parameterVal
  }
}

const getOrderCategory = (order: any) => {
  const orderCategoryParameterEntries = Object.entries(orderCategoryParameters)
  let result = ''
  // using find, as once any of the category is matched then return from here;
  orderCategoryParameterEntries.find((entry: any) => {
    const [category, parameters] = entry
    const paramKeys = Object.keys(parameters)
    // used every as to check against each filtering property
    const isMatched = paramKeys.every((key: string) => Object.prototype.hasOwnProperty.call(order, key) && handleParameterMatching(order[key], parameters[key].value, parameters[key]['OP']))

    // return the value when all params matched for an order
    if (isMatched) {
      result = category;
      return result;
    }
  })
  return result;
}

const isKit = (item: any) => {
  const product = store.getters['product/getProduct'](item.productId);
  return product && product.productTypeId === 'MARKETING_PKG_PICK';
}

const removeKitComponents = (order: any) => {
  const kitItemSeqIds = new Set();
  const itemsWithoutKitComponents = [] as any;


  order.items.forEach((item:any) => {
    const product = store.getters['product/getProduct'](item.productId);
    if (product && product.productTypeId === "MARKETING_PKG_PICK") {
      kitItemSeqIds.add(item.orderItemSeqId);
    }
  })
  
  //In current implementation kit product and component product will have the same orderItemSeqId
  order.items.forEach((item:any) => {
    const product = store.getters['product/getProduct'](item.productId);
    if ((product && product.productTypeId === "MARKETING_PKG_PICK") || !kitItemSeqIds.has(item.orderItemSeqId)) {
      item["productTypeId"] = product.productTypeId
      itemsWithoutKitComponents.push(item)
    }
  })

  return itemsWithoutKitComponents;
}

const retryShippingLabel = async (order: any) => {
  let isGenerated = false;

  // Getting all the shipmentIds from shipmentPackages for which label is missing
  const shipmentIds = order.shipmentPackages
    ?.filter((shipmentPackage: any) => !shipmentPackage.trackingCode)
    .reduce((uniqueIds: any[], shipmentPackage: any) => {
      if(!uniqueIds.includes(shipmentPackage.shipmentId)) uniqueIds.push(shipmentPackage.shipmentId);
      return uniqueIds;
    }, []);

  if(!shipmentIds?.length) {
  showToast(translate("Failed to generate shipping label"))
  return;
  }

  await OrderService.retryShippingLabel(shipmentIds)
  // Updated shipment package detail is needed if the label pdf url is generated on retrying shipping label generation
  // Refetching the order tracking detail irrespective of api response since currently in some cases api returns error whether label is generated
  // Temporarily handling this in app but should be handled in backend
  order = await store.dispatch('order/updateShipmentPackageDetail', order) 
  
  if(order.missingLabelImage) {
    showToast(translate("Failed to generate shipping label"))
  } else {
    showToast(translate("Shipping Label generated successfully"))
    isGenerated = true;
  }

  return { isGenerated, order }
}

export {
  getOrderCategory,
  isKit,
  removeKitComponents,
  retryShippingLabel
}