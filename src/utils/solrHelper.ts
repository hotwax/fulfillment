const prepareOrderQuery = (params: any) => {
  const viewSize = params.viewSize ? params.viewSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = params.viewIndex ? params.viewIndex : 0;

  const payload = {
    "json": {
      "params": {
        "rows": viewSize,
        "sort": params.sort ? params.sort : "reservedDatetime asc",
        "group": true,
        "group.field": params.groupBy ? params.groupBy : "orderId",
        "group.limit": 1000,
        "group.ngroups": true,
        "q.op": "AND",
        "start": viewIndex * viewSize
      },
      "query":"(*:*)",
      "filter": [`docType: ${params.docType ? params.docType : 'OISGIR'}`]
    }
  } as any

  if (params.queryString) {
    payload.json.query = `(*${params.queryString}*) OR "${params.queryString}"^100`
    payload.json.params['qf'] = params.queryFields ? params.queryFields : "productId productName virtualProductName orderId productSku customerId customerName search_orderIdentifications goodIdentifications"
    payload.json.params['defType'] = "edismax"
  }

  // checking that if the params has filters, and then adding the filter values in the payload filter
  // for each key present in the params filters
  if (params.filters) {
    Object.keys(params.filters).map((key: any) => {
      const filterValue = params.filters[key].value;

      if (Array.isArray(filterValue)) {
        const filterOperator = params.filters[key].op ? params.filters[key].op : 'OR' ;
        payload.json.filter += ` AND ${key}: (${filterValue.join(' ' + filterOperator + ' ')})`
      } else {
        payload.json.filter += ` AND ${key}: ${filterValue}`
      }
    })
  }

  if(params.facet) {
    payload.json['facet'] = params.facet
  }

  return payload
}

const escapeSolrSpecialChars = (input: any) => {
  const specialChars = ['\\', '+', '-', '&&', '||', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':'];

  // Escape each special character in the input
  const escapedInput = String(input).replace(new RegExp(`[${specialChars.join('\\')}]`, 'g'), '\\$&');
  return escapedInput;
}

const prepareOrderLookupQuery = (query: any) => {
  const viewSize = query.viewSize ? query.viewSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = query.viewIndex ? query.viewIndex : 0;

  const payload = {
    "json": {
      "params": {
        "sort": `${query.sort}`,
        "rows": viewSize,
        "start": viewSize * viewIndex,
        "group": true,
        "group.field": "orderId",
        "group.limit": 10000,
        "group.ngroups": true,
        "q.op": "AND"
      } as any,
      "query": "*:*",
      "filter": ["docType: ORDER", "orderTypeId: SALES_ORDER"]
    }
  } as any

  payload.json["facet"] = {
    "productStoreIdFacet":{
      "excludeTags":"productStoreNameFilter",
      "field":"productStoreName",
      "mincount":1,
      "limit":-1,
      "type":"terms",
      "facet":{
        "groups":"unique(orderId)"
      }
    },
    "facilityNameFacet":{
      "excludeTags":"facilityNameFilter",
      "field":"facilityName",
      "mincount":1,
      "limit":-1,
      "type":"terms",
      "facet":{
        "groups":"unique(orderId)"
      }
    },
    "salesChannelDescFacet": {
      "excludeTags": "salesChannelDescFilter",
      "field": "salesChannelDesc",
      "mincount": 1,
      "limit": -1,
      "type": "terms",
      "facet": {
        "groups": "unique(orderId)"
      }
    },
    "orderStatusDescFacet": {
      "excludeTags": "orderStatusDescFilter",
      "field": "orderStatusDesc",
      "mincount": 1,
      "limit": -1,
      "sort": {
        "statusSeqId": "asc"
      },
      "type": "terms",
      "facet": {
        "groups": "unique(orderId)",
        "statusSeqId": "max(statusSeqId)"
      }
    },
  }

  if (query.queryString) {
    payload.json.params.defType = "edismax"
    payload.json.params.qf = "orderName orderId customerPartyName productId internalName parentProductName"
    payload.json.query = `*${query.queryString}*`
  }

  // updating the filter value in json object as per the filters selected
  // TODO: optimize this code
  if (query.storePickup) {
    payload.json.filter.push("shipmentMethodTypeId: STOREPICKUP")
  }

  if (query.shipFromStore) {
    payload.json.filter.push("-shipmentMethodTypeId: STOREPICKUP AND facilityTypeId: RETAIL_STORE")
  }

  if (query.facility?.length) {
    payload.json.filter.push(`{!tag=facilityNameFilter}facilityName: ${query.facility.join(" OR ")}`)
  }

  if (query.productStore?.length) {
    payload.json.filter.push(`{!tag=productStoreNameFilter}productStoreName: (${query.productStore.join(" OR ")})`)
  }

  if (query.channel?.length) {
    payload.json.filter.push(`{!tag=salesChannelDescFilter}salesChannelDesc: (${query.channel.join(" OR ")})`)
  }

  if (query.status?.length) {
    payload.json.filter.push(`{!tag=orderStatusDescFilter}orderStatusDesc: (${query.status.join(" OR ")})`)
  }

  if (query.date?.length) {
    payload.json.filter.push(`orderDate: [${query.date}]`)
  }

  return payload
}

export { escapeSolrSpecialChars, prepareOrderQuery, prepareOrderLookupQuery }
