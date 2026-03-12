import { commonUtil, api } from "@common";
import { defineStore } from "pinia";

export const useProductIdentificationStore = defineStore('productIdentification', {
  state: () => {
    return {
      productIdentificationPref: {
        primaryId: '',
        secondaryId: ''
      },
      productIdentificationOptions: [] as any,
      goodIdentificationOptions: [] as any[],
      sampleProducts: [],
      currentSampleProduct: null
    }
  },
  getters: {
    getProductIdentificationPref: (state) => state.productIdentificationPref,
    getProductIdentificationOptions: (state) => state.productIdentificationOptions,
    getGoodIdentificationOptions: (state) => state.goodIdentificationOptions,
    getCurrentSampleProduct: (state) => state.currentSampleProduct
  },
  actions: {
    async setProductIdentificationPref(id: string, value: string, productStoreId: string) {
      const productIdentificationPref = JSON.parse(JSON.stringify(this.getProductIdentificationPref))

      // When productStoreId is not available then make the values change to what selected previously
      if (!productStoreId) {
        this.productIdentificationPref = productIdentificationPref
        return;
      }

      productIdentificationPref[id] = value

      try {
        let resp = {} as any, isSettingExists = false;
        try {
          resp = await api({
            url: `oms/productStores/${productStoreId}/settings`,
            method: "GET",
            params: {
              productStoreId: productStoreId,
              settingTypeEnumId: "PRDT_IDEN_PREF"
            }
          });

          if (resp.data[0]?.settingTypeEnumId) isSettingExists = true
        } catch (err) {
          console.error(err)
        }

        if (!isSettingExists) {
          throw {
            code: "error",
            message: "product store setting is missing",
            serverResponse: resp.data
          }
        }

        await api({
          url: `oms/productStores/${productStoreId}/settings`,
          method: "POST",
          data: {
            productStoreId: productStoreId,
            settingTypeEnumId: "PRDT_IDEN_PREF",
            settingValue: JSON.stringify(productIdentificationPref)
          }
        });

        this.productIdentificationPref = productIdentificationPref;
      } catch (err) {
        // TODO: display a toast message in failed scenario
        console.error('error', err)
      }
    },
    async getIdentificationPref(productStoreId: string) {
      // when selecting none as ecom store, not fetching the pref as it returns all the entries with the pref id
      if (!productStoreId) {
        return this.productIdentificationPref = {
          primaryId: 'productId',
          secondaryId: ''
        };
      }

      const productIdentifications = {
        primaryId: "productId",
        secondaryId: ""
      }

      const resp = await api({
        url: `oms/productStores/${productStoreId}/settings`,
        method: "GET",
        params: {
          productStoreId: productStoreId,
          settingTypeEnumId: "PRDT_IDEN_PREF"
        }
      }) as any;

      const settings = resp.data
      if (settings[0]?.settingValue) {
        const respValue = JSON.parse(settings[0].settingValue)
        productIdentifications['primaryId'] = respValue['primaryId']
        productIdentifications['secondaryId'] = respValue['secondaryId']
      } else {
        try {
          await api({
            url: `oms/productStores/${productStoreId}/settings`,
            method: "POST",
            data: {
              productStoreId: productStoreId,
              settingTypeEnumId: "PRDT_IDEN_PREF",
              settingValue: JSON.stringify(productIdentifications)
            }
          });
        } catch (err) {
          console.error(err)
        }
      }

      this.productIdentificationPref = productIdentifications;
    },
    async prepareProductIdentifierOptions() {
      //static identifications 
      const productIdentificationOptions = [
        { goodIdentificationTypeId: "productId", description: "Product ID" },
        { goodIdentificationTypeId: "groupId", description: "Group ID" },
        { goodIdentificationTypeId: "groupName", description: "Group Name" },
        { goodIdentificationTypeId: "internalName", description: "Internal Name" },
        { goodIdentificationTypeId: "parentProductName", description: "Parent Product Name" },
        { goodIdentificationTypeId: "primaryProductCategoryName", description: "Primary Product Category Name" },
        { goodIdentificationTypeId: "title", description: "Title" }
      ]
      //good identification types
      let fetchedGoodIdentificationOptions = []
      try {
        const resp: any = await api({
          url: "oms/goodIdentificationTypes",
          method: "get",
          params: {
            parentTypeId: "HC_GOOD_ID_TYPE",
            pageSize: 50
          }
        });

        fetchedGoodIdentificationOptions = resp.data
      } catch (error) {
        console.error('Failed to fetch good identification types', error)
      }

      // Merge the arrays and remove duplicates
      this.productIdentificationOptions = Array.from(new Set([...productIdentificationOptions, ...fetchedGoodIdentificationOptions])).sort();
      this.goodIdentificationOptions = fetchedGoodIdentificationOptions
    },
    async fetchProducts() {
      const params = { viewSize: 10 }
      try {
        const products = await api({
          baseURL: commonUtil.getOmsURL(),
          url: "searchProducts",
          method: "post",
          data: params,
          cache: true
        }) as any;

        if (!commonUtil.hasError(products)) {
          this.sampleProducts = products.data.response.docs;
          this.shuffleProduct()
        } else {
          throw products.data
        }
      } catch (error: any) {
        console.error(error)
      }
    },
    shuffleProduct() {
      if (this.sampleProducts.length) {
        const randomIndex = Math.floor(Math.random() * this.sampleProducts.length)
        this.currentSampleProduct = this.sampleProducts[randomIndex]
      } else {
        this.currentSampleProduct = null
      }
    }
  }
})
