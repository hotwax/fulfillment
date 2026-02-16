/* eslint-disable */
import { getCurrentFacilityId } from ".";
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

const prepareSolrQuery = (params: any) => {
  const viewSize = params.viewSize ? params.viewSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = params.viewIndex ? params.viewIndex : 0;
  let groupParams = {} as any;

  if(params.isGroupingRequired) {
    groupParams = {
      "group": true,
      "group.field": params.groupBy ? params.groupBy : "orderId",
      "group.limit": params.groupLimit ? params.groupLimit : 1000,
      "group.ngroups": true,
    }
  }

  const payload = {
    "json": {
      "params": {
        "rows": viewSize,
        "sort": params.sort ? params.sort : "reservedDatetime asc",
        "q.op": "AND",
        "start": viewIndex * viewSize,
        ...groupParams
      },
      "query":"(*:*)",
      "filter": [`docType: ${params.docType ? params.docType : 'OISGIR'}`]
    }
  } as any

  // Default coreName is "enterpriseSearch"
  if(params.coreName) payload["coreName"] = params.coreName;

  if (params.queryString) {
    payload.json.query = `(*${params.queryString}*) OR "${params.queryString}"^100`
    payload.json.params['qf'] = params.queryFields ? params.queryFields : "productId productName virtualProductName orderId productSku customerId customerName search_orderIdentifications goodIdentifications"
    payload.json.params['defType'] = "edismax"
  }

  if (params.fieldsToSelect) {
    payload.json.params['fl'] = params.fieldsToSelect
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
  //adding solrFilters to pass solr filter strings directly
  if (params.solrFilters) {
    params.solrFilters.forEach((solrFilterString: any) => {
      payload.json.filter += ` AND ${solrFilterString}`
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
      "filter": ["docType: ORDER", "orderTypeId: SALES_ORDER", "facilityId: " + getCurrentFacilityId()]
    }
  } as any

  if(query.fetchFacets) {
    payload.json["facet"] = {
      "productStoreIdFacet":{
        "excludeTags":"orderLookupFilter",
        "field":"productStoreName",
        "mincount":1,
        "limit":-1,
        "type":"terms",
        "facet":{
          "groups":"unique(orderId)"
        }
      },
      "salesChannelDescFacet": {
        "excludeTags": "orderLookupFilter",
        "field": "salesChannelDesc",
        "mincount": 1,
        "limit": -1,
        "type": "terms",
        "facet": {
          "groups": "unique(orderId)"
        }
      },
      "orderStatusDescFacet": {
        "excludeTags": "orderLookupFilter",
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
  }


  if (query.queryString) {
    payload.json.params.defType = "edismax"
    payload.json.params.qf = "orderName orderId customerPartyName productId internalName parentProductName"
    payload.json.query = `*${query.queryString}*`
  }

  // updating the filter value in json object as per the filters selected
  // TODO: optimize this code
  const shipmentMethodTypeIdValues = []
  if(query.storePickup) shipmentMethodTypeIdValues.push("STOREPICKUP")
  if(query.shipFromStore) shipmentMethodTypeIdValues.push("STANDARD")

  if (shipmentMethodTypeIdValues.length) {
    payload.json.filter.push(`{!tag=orderLookupFilter}shipmentMethodTypeId: (${shipmentMethodTypeIdValues.join(" OR ")})`)
  }

  if (query.productStore?.length) {
    payload.json.filter.push(`{!tag=orderLookupFilter}productStoreName: (\"${query.productStore.join('\" OR \"')}\")`)
  }

  if (query.channel?.length) {
    payload.json.filter.push(`{!tag=orderLookupFilter}salesChannelDesc: (\"${query.channel.join('\" OR \"')}\")`)
  }

  if (query.status?.length) {
    payload.json.filter.push(`{!tag=orderLookupFilter}orderStatusDesc: (\"${query.status.join('\" OR \"')}\")`)
  }

  if (query.date && query.date !== "custom") {
    payload.json.filter.push(`{!tag=orderLookupFilter}orderDate: [${query.date}]`)
  } else {
    let dateFilter = ""

    if(query.fromDate) dateFilter += query.fromDate.split("T")[0] + "T00:00:00Z"

    // Added T23:59:59, as we need to include the orders for to date as well
    if(query.toDate) dateFilter += ` TO ${query.toDate.split("T")[0]}` + "T23:59:59Z"
    else if(query.fromDate) dateFilter += " TO *"

    if (dateFilter) {
      payload.json.filter.push(`{!tag=orderLookupFilter}orderDate: [${dateFilter}]`)
    }
  }


  return payload
}

export { escapeSolrSpecialChars, prepareOrderQuery, prepareOrderLookupQuery, prepareSolrQuery }
