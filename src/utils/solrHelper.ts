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

export { prepareOrderQuery }
