import { api } from '@common';
import { commonUtil } from "@common";

import { logger } from '@common';

enum OPERATOR {
  AND = 'AND',
  BETWEEN = 'between',
  CONTAINS = 'contains',
  EQUALS = 'equals',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_EQUAL_TO = 'greaterThanEqualTo',
  IN = 'in',
  LESS_THAN = 'lessThan',
  LESS_THAN_EQUAL_TO = 'lessThanEqualTo',
  LIKE = 'like',
  NOT = 'not',
  NOT_EMPTY = 'not-empty',
  NOT_EQUAL = 'notEqual',
  NOT_LIKE = 'notLike',
  OR = 'OR',
}

const fetchProducts = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "searchProducts",
    method: "post",
    data: query,
    cache: true
  });
}

const fetchProductComponents = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "post",
    data: payload,
  });
}

const fetchProductAverageCost = async (productId: string, facilityId: string): Promise<any> => {

  if (!productId) return;
  let productAverageCost = ''

  const payload = {
    customParametersMap: {
      facilityId,
      productId,
      orderByField: "-fromDate",
      pageIndex: 0,
      pageSize: 1
    },
    dataDocumentId: "ProductWeightedAverageCost",
    filterByDate: true
  };

  try {
    const resp = await api({
      url: `/oms/dataDocumentView`,
      method: "post",
      data: payload
    });

    if (!commonUtil.hasError(resp) && resp.data?.entityValueList?.length) {
      const list = resp.data.entityValueList;
      productAverageCost = list[0].averageCost;
    }
  } catch (err) {
    logger.error("Failed to fetch product average cost", err);
    return;
  }

  return productAverageCost;
};

const fetchBarcodeIdentificationDesc = async (params: any): Promise<any> => {
  return api({
    url: `/oms/goodIdentificationTypes`,
    method: "get",
    params
  });
}

const getProductIdentificationPref = async (productStoreId: any): Promise<any> => {
  const productIdentifications = {
    primaryId: "productId",
    secondaryId: ""
  }

  try {
    const resp = await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "GET",
      params: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF"
      }
    }) as any;

    const settings = resp.data
    if (settings[0]?.settingValue) {
      const respValue = JSON.parse(settings[0].settingValue)
      productIdentifications['primaryId'] = respValue['primaryId']
      productIdentifications['secondaryId'] = respValue['secondaryId']
    } else {
      await createProductIdentificationPref(productStoreId)
    }
  } catch (error: any) {
    return Promise.reject({
      code: "error",
      message: "Failed to get product identification pref",
      serverResponse: error
    })
  }

  return productIdentifications;
}

const createProductIdentificationPref = async (productStoreId: string): Promise<any> => {
  const prefValue = {
    primaryId: "productId",
    secondaryId: ""
  }

  try {
    await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "POST",
      data: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF",
        settingValue: JSON.stringify(prefValue)
      }
    });
  } catch (err) {
    console.error(err)
  }

  return prefValue;
}

const fetchGoodIdentificationTypes = async (parentTypeId = "HC_GOOD_ID_TYPE"): Promise<any> => {
  try {
    const resp: any = await api({
      url: "oms/goodIdentificationTypes",
      method: "get",
      params: {
        parentTypeId,
        pageSize: 50
      }
    });

    return Promise.resolve(resp.data)
  } catch (error) {
    return Promise.reject({
      code: 'error',
      message: 'Failed to fetch good identification types',
      serverResponse: error
    })
  }
}

const searchProducts = async (params: { keyword?: string, sort?: string, qf?: string, viewSize?: number, viewIndex?: number, filters?: any }): Promise<any> => {
  const rows = params.viewSize ?? 100
  const start = rows * (params.viewIndex ?? 0)
  const keyword = params.keyword?.trim();

  const payload = {
    "json": {
      "params": {
        rows,
        start,
        "qf": "productId^20 productName^40 internalName^30 search_goodIdentifications parentProductName",
        "sort": "sort_productName asc",
        "defType": "edismax"
      },
      "query": "*:*",
      "filter": "docType: PRODUCT"
    }
  }

  let keywordString = ""

  if (keyword) {
    if (keyword.startsWith('"')) {
      keywordString = keyword.replace('"', "").replace('"', "");
    } else {
      const keywordTokens = keyword.split(" ")
      const tokens: Array<string> = []

      keywordTokens.forEach((token: string) => {
        const regEx = /[`!@#$%^&*()_+\-=\\|,.<>?~]/
        if (regEx.test(token)) {
          const matchedTokens = [...new Set(token.match(regEx))]
          matchedTokens?.forEach((matchedToken: string) => {
            tokens.push(token.split(matchedToken).join(`\\\\${matchedToken}`))
          })
        } else {
          tokens.push(token)
        }
      })

      keywordString = tokens.join(`* ${OPERATOR.OR} `)
      keywordString += `* ${OPERATOR.OR} "${keyword}"^100`
    }

    if (keywordString) {
      payload.json.query = `(${keywordString})`
    }
  } else {
    params.qf && (payload.json.params.qf = params.qf)
    params.sort && (payload.json.params.sort = params.sort)
  }

  if (params.filters) {
    Object.keys(params.filters).forEach((key: any) => {
      const filterValue = params.filters[key].value;

      if (Array.isArray(filterValue)) {
        const filterOperator = params.filters[key].op ? params.filters[key].op : OPERATOR.OR;
        payload.json.filter += ` ${OPERATOR.AND} ${key}: (${filterValue.join(' ' + filterOperator + ' ')})`
      } else {
        payload.json.filter += ` ${OPERATOR.AND} ${key}: ${filterValue}`
      }
    })
  }

  if (!params.filters?.isVirtual) {
    payload.json.filter += ` ${OPERATOR.AND} isVirtual: false`
  }

  try {
    const resp = await api({
      url: "solr-query",
      method: "post",
      data: payload,
      baseURL: commonUtil.getOmsURL()
    }) as any;

    if (resp.status == 200 && !commonUtil.hasError(resp) && resp.data?.response?.numFound > 0) {
      const product = resp.data.response.docs
      return {
        products: product,
        total: resp.data.response.numFound
      }
    } else {
      return {
        products: {},
        total: 0
      }
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

const setProductIdentificationPref = async (productStoreId: string, productIdentificationPref: any): Promise<any> => {
  let resp = {} as any, isSettingExists = false;

  try {
    resp = await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "GET",
      params: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF"
      }
    });

    if (resp.data[0]?.settingTypeEnumId) isSettingExists = true
  } catch (err) {
    console.error(err)
  }

  if (!isSettingExists) {
    return Promise.reject({
      code: "error",
      message: "product store setting is missing",
      serverResponse: resp.data
    })
  }

  try {
    resp = await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "POST",
      data: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF",
        settingValue: JSON.stringify(productIdentificationPref)
      }
    });

    return Promise.resolve(productIdentificationPref)
  } catch (error) {
    return Promise.reject({
      code: "error",
      message: "Failed to set product identification pref",
      serverResponse: error
    })
  }
}

export const ProductService = {
  fetchProducts,
  fetchProductComponents,
  fetchProductAverageCost,
  fetchBarcodeIdentificationDesc,
  getProductIdentificationPref,
  createProductIdentificationPref,
  fetchGoodIdentificationTypes,
  searchProducts,
  setProductIdentificationPref
}
