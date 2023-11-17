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

const isKitComponent = (item: any) => {
  return item.toOrderItemAssocs?.some((assoc: any) => assoc.split("/")[0] === 'KIT_COMPONENT')
}

const getKitProducts = (order: any) => {
  return order.items.reduce((kitProducts: any, item: any) => {
    if (item.toOrderItemAssocs && isKitComponent(item)) {
      // getting second and third values i.e kit product's orderItemSeqId and parentProductId
      const [, orderItemSeqId, parentProductId] = item.toOrderItemAssocs[0].split('/')
      if (!kitProducts[orderItemSeqId]) {
        kitProducts[orderItemSeqId] = []
      }

      kitProducts[orderItemSeqId].push({
        parentProductId,
        ...item
      })
    }

    return kitProducts
  }, {})
}

export {
  getKitProducts,
  getOrderCategory,
  isKitComponent
}