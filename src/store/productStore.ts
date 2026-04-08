import { defineStore } from 'pinia'
import { api, commonUtil, useEmbeddedAppStore, logger, translate, useSolrSearch } from '@common'
import { useUserStore } from '@/store/user'
const defaultProductStoreSettings = JSON.parse(import.meta.env.VITE_DEFAULT_PRODUCT_STORE_SETTINGS as string || '{}')

export const useProductStore = defineStore('productStore', {
  state: () => ({
    currentFacility: {
      facilityId: "",
      facilityName: "",
      productStores: []
    } as any,
    currentEComStore: {} as any,
    productStoreShipmentMethCount: 0,
    settings: {
      forceScan: "",
      partialOrderRejection: "",
      collateralRejection: "",
      autoShippingLabel: "",
      downloadPicklist: "",
      excludeOrderBrokerDays: undefined,
      affectQoh: "",
      disableShipNow: "",
      disableUnpack: "",
      useReservationFacility: "",

      productIdentifier: {
        productIdentificationPref: {
          primaryId: '',
          secondaryId: ''
        },
        productIdentificationOptions: [] as any[],
        sampleProducts: [],
        currentSampleProduct: null
      },
      barcodeIdentifier: {
        barcodeIdentifierPref: "",
        barcodeIdentifierOptions: [] as any[],
      },
    } as any,
    userFacilities: {} as any,
    facilities: [] as any[],
    productStores: [] as any[],
  }),

  getters: {
    getCurrentFacility: (state) => state.currentFacility,
    getCurrentEComStore: (state) => state.currentEComStore,
    getProductStoreShipmentMethCount: (state) => state.productStoreShipmentMethCount,
    getProductStores: (state) => state.currentFacility.productStores || [],
    getFacilities: (state) => state.userFacilities || [],
    getAllFacilities: (state) => state.facilities,
    getAllProductStores: (state) => state.productStores,
    getSettings: (state) => state.settings,
    getProductIdentificationPref: (state) => state.settings.productIdentifier.productIdentificationPref,
    getBarcodeIdentifierPref: (state) => state.settings.barcodeIdentifier.barcodeIdentifierPref,
    getProductIdentificationOptions: (state) => state.settings.productIdentifier.productIdentificationOptions,
    getBarcodeIdentifierOptions: (state) => state.settings.barcodeIdentifier.barcodeIdentifierOptions,
    getCurrentSampleProduct: (state) => state.settings.productIdentifier.currentSampleProduct,
    isProductStoreSettingEnabled: (state) => (settingTypeEnumId: string) => {
      const stateKey = defaultProductStoreSettings[settingTypeEnumId]?.stateKey || settingTypeEnumId
      return state.settings[stateKey] === "Y"
    },
    isExcludeOrderBrokerDaysEnabled(): boolean {
      return this.isProductStoreSettingEnabled('EXCLUDE_ODR_BKR_DAYS')
    },
    isRerouteSettingEnabled: (state) => (settingName: string) => state.settings.rerouteFulfillment[settingName] === "Y",
    getRerouteShipmentMethod: (state) => state.settings.rerouteFulfillment.shippingMethod,
    getFacilityName: (state) => (facilityId: string) => state.userFacilities[facilityId] ? state.userFacilities[facilityId] : facilityId,
  },

  actions: {
    setCurrentFacility(facility: any) {
      this.currentFacility = facility
    },
    async setCurrentEComStore(store: any) {
      this.currentEComStore = store
      await this.fetchEComStoreDependencies(store.productStoreId)
    },
    async fetchUserFacilities() {
      const userStore = useUserStore();
      let facilityIds: Array<string> = [];
      let filters: any = {};
      let resp = {} as any

      const partyId = userStore.getUserProfile?.partyId;
      const isAdminUser = userStore.hasPermission("STOREFULFILLMENT_ADMIN");
      const facilityGroupId = "OMS_FULFILLMENT";

      try {
        this.currentFacility = {
          ...this.currentFacility,
          productStores: []
        }

        // Fetch the facilities associated with party
        if (partyId && !isAdminUser) {
          try {
            resp = await api({
              url: `admin/user/${partyId}/facilities`,
              method: "GET",
              params: {
                pageSize: 500
              }
            } as any);

            // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
            // Considering that the facilities will always have a thruDate of the past.
            const facilities = resp.data.filter((facility: any) => !facility.thruDate)

            facilityIds = facilities.map((facility: any) => facility.facilityId);
            if (!facilityIds.length) {
              return Promise.reject({
                code: 'error',
                message: 'Failed to fetch user facilities',
                serverResponse: resp.data
              })
            }
          } catch (error) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch user associated facilities',
              serverResponse: error
            })
          }
        }

        if (facilityIds.length) {
          filters = {
            facilityId: facilityIds.join(","),
            facilityId_op: "in",
            pageSize: facilityIds.length
          }
        }

        // Fetch the facilities associated with group
        if (facilityGroupId) {
          try {
            resp = await api({
              url: "oms/groupFacilities",
              method: "GET",
              params: {
                facilityGroupId,
                pageSize: 500,
                ...filters
              }
            } as any);

            // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
            // Considering that the facilities will always have a thruDate of the past.
            const facilities = resp.data.filter((facility: any) => !facility.thruDate)

            facilityIds = facilities.map((facility: any) => facility.facilityId);
            if (!facilityIds.length) {
              return Promise.reject({
                code: 'error',
                message: 'Failed to fetch user facilities',
                serverResponse: resp.data
              })
            }
          } catch (error) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch facilities for group',
              serverResponse: error
            })
          }
        }

        // Only Location's facility for Shopify POS Users.
        const shopifyLocationId = useEmbeddedAppStore().posContext.locationId
        if (commonUtil.isAppEmbedded() && shopifyLocationId) {
          const locationFacilityId = await this.fetchShopifyShopLocation({
            shopifyLocationId,
            pageSize: 1
          })
          if (locationFacilityId) facilityIds = facilityIds.filter((id: any) => id === locationFacilityId)
          else facilityIds = [];
          if (!facilityIds.length) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch user facilities for Shopify POS location',
              serverResponse: resp.data
            })
          }
        }

        if (facilityIds.length) {
          filters = {
            facilityId: facilityIds.join(","),
            facilityId_op: "in",
            pageSize: facilityIds.length
          }
        }

        const params = {
          url: "oms/facilities",
          method: "GET",
          params: {
            pageSize: 500,
            ...filters
          }
        }

        resp = await api(params);
        this.userFacilities = resp.data
        this.setCurrentFacility(resp.data[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async setFacilityPreference(payload: any) {
      const userStore = useUserStore();
      try {
        await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: userStore.getUserProfile.userId,
            preferenceKey: 'SELECTED_FACILITY',
            preferenceValue: payload.facilityId,
          }
        });
      } catch (error) {
        console.error('error', error)
      }
      this.currentFacility = payload;
    },
    async fetchFacilityPreference() {
      if (!this.facilities.length) return;
      let facilityId: string | undefined;
      try {
        const locationId = useEmbeddedAppStore().posContext.locationId;
        if (commonUtil.isAppEmbedded() && locationId) {
          facilityId = await this.fetchShopifyShopLocation({
            shopifyLocationId: locationId,
            pageSize: 1,
          });
          if (!facilityId) {
            throw new Error("Failed to fetch location information. Please contact the administrator.");
          }
        } else {
          const preferredFacilityResp = await api({
            url: "admin/user/preferences",
            method: "GET",
            params: {
              pageSize: 1,
              userId: useUserStore().current.userId,
              preferenceKey: "SELECTED_FACILITY"
            },
          }) as any;
        facilityId = preferredFacilityResp.data?.[0]?.preferenceValue;
        }
        if (facilityId) {
          const facility = this.facilities.find((f: any) => f.facilityId === facilityId);
          if (!facility && commonUtil.isAppEmbedded() && locationId) {
            throw new Error(
              "User is not associated with this location. Please contact the administrator."
            );
          }
          if (facility) {
            this.setCurrentFacility(facility)
            return;
          }
        }
      } catch (error) {
        console.error("Failed to resolve facility preference:", error);
      }
      // In case app is not embedded and user has no facility preference on server
      this.currentFacility = this.facilities[0];
    },
    async fetchProductStores(currentFacilityId?: string) {
      try {
        const facilityId = currentFacilityId ?? this.currentFacility.facilityId;
        const pageSize = 200;

        const resp = await api({
          url: `oms/facilities/${facilityId}/productStores`,
          method: "GET",
          params: {
            pageSize,
            facilityId
          }
        }) as any;

        const stores = resp.data.filter((store: any) => !store.thruDate)

        if (stores.length) {
          // Fetching all stores for the store name
          try {
            const productStoresResp = await api({
              url: "oms/productStores",
              method: "GET",
              params: {
                pageSize: 200
              }
            }) as any;
            const productStores = productStoresResp.data;
            const productStoresMap = {} as any;
            productStores.map((store: any) => productStoresMap[store.productStoreId] = store.storeName)
            stores.map((store: any) => store.storeName = productStoresMap[store.productStoreId])
          } catch (error) {
            console.error(error);
          }
        }

        const productStores = [...stores]
        productStores.push({
          productStoreId: "",
          storeName: "None",
        });

        this.currentFacility = {
          ...this.currentFacility,
          productStores
        }
        this.setCurrentEComStore(productStores[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async fetchAllFacilities() {
      let facilities = []
      try {
        const payload = {
          parentTypeId: "VIRTUAL_FACILITY",
          parentTypeId_op: "equals",
          parentTypeId_not: "Y",
          facilityTypeId: "VIRTUAL_FACILITY",
          facilityTypeId_op: "equals",
          facilityTypeId_not: "Y",
          pageSize: 250
        }

        const resp = await api({
          url: "/oms/facilities",
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          facilities = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch facilities", err)
      }
      this.facilities = facilities
    },
    async getFacilityDetails(payload: any): Promise<any> {
      return api({
        url: `/oms/facilities/${payload.facilityId}`,
        method: "GET",
        params: payload
      });
    },
    async getFacilityOrderCount(payload: any): Promise<any> {
      return api({
        url: `/oms/facilities/facilityOrderCounts`,
        method: "GET",
        params: payload
      });
    },
    async updateFacility(payload: any): Promise<any> {
      return api({
        url: `/oms/facilities/${payload.facilityId}`,
        method: "PUT",
        data: payload
      });
    },
    async updateFacilityToGroup(payload: any): Promise<any> {
      return api({
        url: `/oms/facilities/${payload.facilityId}/groups`,
        method: "POST",
        data: payload
      });
    },
    async addFacilityToGroup(payload: any): Promise<any> {
      return api({
        url: `/oms/facilities/${payload.facilityId}/groups`,
        method: "POST",
        data: payload
      });
    },
    async getFacilityGroupDetails(payload: any): Promise<any> {
      return api({
        url: `/oms/facilityGroups`,
        method: "get",
        params: payload
      });
    },
    async fetchFacilitiesList(payload: any): Promise<any> {
      return api({
        url: "/oms/facilities",
        method: "GET",
        params: payload
      });
    },
    async fetchProductStoreFacilities(): Promise<any> {
      try {
        const productStoreId = this.getCurrentEComStore?.productStoreId;

        if (!productStoreId) {
          logger.error('Product store ID not found');
          return [];
        }

        const params = {
          facilityTypeId: 'VIRTUAL_FACILITY',
          facilityTypeId_op: 'equals',
          facilityTypeId_not: 'Y',
          parentFacilityTypeId: 'VIRTUAL_FACILITY',
          parentFacilityTypeId_op: 'equals',
          parentFacilityTypeId_not: 'Y',
          pageSize: 250,
        };

        const resp = await api({
          url: `/oms/productStores/${productStoreId}/facilities`,
          method: "GET",
          params
        });

        if (!commonUtil.hasError(resp)) {
          return resp.data;
        } else {
          logger.error('Failed to fetch product store facilities:', resp.data);
          return [];
        }
      } catch (err) {
        logger.error('Failed to fetch product store facilities:', err);
        return [];
      }
    },
    async fetchFacilityAddresses(payload: any): Promise<any> {
      return api({
        url: `/oms/facilityContactMechs`,
        method: "GET",
        params: payload,
      });
    },
    async fetchFacilityZPLGroupInfo(): Promise<any> {
      let isFacilityZPLConfigured = false;
      const payload = {
        customParametersMap: {
          facilityGroupId: "ZPL_SHIPPING_LABEL",
          facilityGroupTypeId: "SHIPPING_LABEL",
          pageIndex: 0,
          pageSize: 1
        },
        dataDocumentId: "FacilityGroupAndMember",
        filterByDate: true,
      }

      try {
        const resp = await api({
          url: `/oms/dataDocumentView`,
          method: "POST",
          data: payload
        });

        if (!commonUtil.hasError(resp) && resp.data?.entityValueList?.length > 0) {
          isFacilityZPLConfigured = true
        } else {
          throw resp.data;
        }
      } catch (err) {
        logger.error(err)
      }
      return isFacilityZPLConfigured;
    },
    async getFacilityGroupAndMemberDetails(payload: any): Promise<any> {
      return api({
        url: `/oms/dataDocumentView`,
        method: "post",
        data: payload
      });
    },
    async fetchFacilityTypeInformation(query: any): Promise<any> {
      return api({
        url: `/oms/facilities`,
        method: "GET",
        params: query,
      });
    },
    async fetchAllProductStores() {
      let stores = []
      try {
        const payload = {
          fieldsToSelect: ["productStoreId", "storeName"],
          pageSize: 250
        }

        const resp = await api({
          url: `/oms/productStores`,
          method: "GET",
          params: payload
        });

        if (!commonUtil.hasError(resp)) {
          stores = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch product stores", err)
      }
      this.productStores = stores
    },
    async fetchProductStorePreference() {
      const userStore = useUserStore();
      try {
        const preferredStoreResp = await api({
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: userStore.current.userId,
            preferenceKey: "SELECTED_BRAND"
          },
        }) as any;
        const preferredStoreId = preferredStoreResp.data?.[0]?.preferenceValue
        if (preferredStoreId) {
          const store = this.currentFacility.productStores?.find((store: any) => store.productStoreId === preferredStoreId);
          store && this.setCurrentEComStore(store)
        }
      } catch (err) {
        logger.error('Favourite product store not found', err)
      }
    },
    async fetchEComStoreDependencies(productStoreId: string) {
      await useProductStore().fetchProductStoreSettings(productStoreId)
        .catch((error) => logger.error(error))

      this.findProductStoreShipmentMethCount()
    },
    setProductStoreShipmentMethCount(payload: number) {
      this.productStoreShipmentMethCount = payload
    },
    async findProductStoreShipmentMethCount() {
      let productStoreShipmentMethCount = 0
      const params = {
        partyId: "_NA_",
        partyId_op: "equals",
        partyId_not: "Y",
        roleTypeId: "CARRIER",
        productStoreId: this.getCurrentEComStore?.productStoreId,
        fieldsToSelect: ["roleTypeId", "partyId"],
        pageSize: 1
      }

      try {
        const resp = await api({
          url: `/oms/productStores/shipmentMethods/counts`,
          method: "GET",
          params
        });

        if (!commonUtil.hasError(resp)) {
          productStoreShipmentMethCount = resp.data[0]?.shipmentMethodCount
        } else {
          throw resp?.data
        }
      } catch (err) {
        logger.error("Failed to find shipment method count for product store", err)
      }

      this.setProductStoreShipmentMethCount(productStoreShipmentMethCount)
    },
    async setEComStorePreference(payload: any) {
      const userStore = useUserStore();
      try {
        await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: userStore.current.userId,
            preferenceKey: 'SELECTED_BRAND',
            preferenceValue: payload.productStoreId,
          }
        });
      } catch (error) {
        console.error('error', error)
      }
      this.currentEComStore = payload;
    },
    async fetchProductStoreSettings(productStoreId: string) {
      const productStoreSettings = {} as any

      if (productStoreId) {
        const payload = {
          productStoreId,
          settingTypeEnumId: Object.keys(defaultProductStoreSettings),
          settingTypeEnumId_op: "in",
          pageIndex: 0,
          pageSize: 50
        }
        try {
          const resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: {
              dataDocumentId: "ProductStoreSetting",
              customParametersMap: payload
            }
          }) as any

          resp?.data?.entityValueList?.forEach((productSetting: any) => {
            productStoreSettings[productSetting.settingTypeEnumId] = productSetting.settingValue
          })
        } catch (error) {
          logger.error("Failed to fetch settings", error)
        }
      }

      Object.entries(defaultProductStoreSettings).forEach(([settingTypeEnumId, setting]: any) => {
        const { stateKey, value } = setting;
        const settingValue = productStoreSettings[settingTypeEnumId];
        let finalValue;
        try {
          finalValue = settingValue ? JSON.parse(settingValue) : value;
        } catch (e) {
          finalValue = settingValue; // fallback to raw value
        }

        const keys = stateKey.split('.');
        let current = this.settings;

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];

          if (i === keys.length - 1) {
            current[key] = finalValue;
          } else {
            // ensure object exists at each level
            if (!current[key] || typeof current[key] !== 'object') {
              current[key] = {};
            }
            current = current[key];
          }
        }
      })
    },
    async fetchAutoShippingLabelConfig() {
      let resp: any

      try {
        resp = await api({
          url: `/oms/dataDocumentView`,
          method: "post",
          data: {
            customParametersMap: {
              facilityId: this.getCurrentFacility?.facilityId,
              facilityGroupId: "AUTO_SHIPPING_LABEL",
              pageIndex: 0,
              pageSize: 1
            },
            dataDocumentId: "FacilityGroupAndMember",
            filterByDate: true
          }
        })

        this.settings.autoShippingLabel = !commonUtil.hasError(resp) && resp.data?.entityValueList?.length > 0 ? "Y" : "N"
      } catch (error) {
        logger.error("Failed to check auto shipping label group", error)
        this.settings.autoShippingLabel = "N"
      }
    },

    async setProductStoreSetting(productStoreId: string, settingTypeEnumId: string, settingValue: any) {
      try {
        const payloadSettingValue = typeof settingValue === 'object' ? JSON.stringify(settingValue) : settingValue;
        const resp = await api({
          url: `admin/productStores/${productStoreId}/settings`,
          method: 'POST',
          data: {
            productStoreId,
            settingTypeEnumId,
            settingValue: payloadSettingValue
          }
        })
        if (!commonUtil.hasError(resp)) {
          const defaultSetting = defaultProductStoreSettings[settingTypeEnumId]
          const { stateKey } = defaultSetting
          const keys = stateKey.split('.');
          let current = this.settings;

          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (i === keys.length - 1) {
              current[key] = settingValue;
            } else {
              // ensure object exists at each level
              if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
              }
              current = current[key];
            }
          }
          commonUtil.showToast(translate('Product Store setting updated successfully.'))
        } else {
          throw resp
        }
      } catch (err) {
        commonUtil.showToast(translate('Failed to update Product Store setting.'))
        logger.error(err)
      }
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
      this.settings.productIdentifier.productIdentificationOptions = Array.from(new Set([...productIdentificationOptions, ...fetchedGoodIdentificationOptions])).sort();
      this.settings.barcodeIdentifier.barcodeIdentifierOptions = fetchedGoodIdentificationOptions
    },

    async fetchProducts() {
      try {
        const resp = await useSolrSearch().searchProducts({
          viewSize: 10
        })

        if (resp.products.length) {
          this.settings.productIdentifier.sampleProducts = resp.products;
          this.shuffleProduct()
        } else {
          throw resp
        }
      } catch (error: any) {
        console.error(error)
      }
    },
    shuffleProduct() {
      if (this.settings.productIdentifier.sampleProducts.length) {
        const randomIndex = Math.floor(Math.random() * this.settings.productIdentifier.sampleProducts.length)
        this.settings.productIdentifier.currentSampleProduct = this.settings.productIdentifier.sampleProducts[randomIndex]
      } else {
        this.settings.productIdentifier.currentSampleProduct = null
      }
    },
    async fetchFacilities(facilityIds: any) {
      const cachedFacilityIds = Object.keys(this.userFacilities);
      const facilityIdFilter = [...new Set(facilityIds.filter((facilityId: any) => !cachedFacilityIds.includes(facilityId)))]

      if (!facilityIdFilter.length) return;

      const payload = {
        inputFields: {
          facilityId: facilityIdFilter,
          facilityId_op: "in"
        },
        viewSize: facilityIdFilter.length,
        entityName: "Facility",
        noConditionFind: 'Y',
        distinct: "Y",
        fieldList: ["facilityId", "facilityName"]
      }

      try {
        const resp = await api({
          url: "/admin/facilities",
          method: "GET",
          data: payload
        });
        if (!commonUtil.hasError(resp) && resp.data.length > 0) {
          resp.data.map((facility: any) => {
            this.userFacilities[facility.facilityId] = facility["facilityName"]
          })
        } else {
          throw resp.data;
        }
      } catch (err) {
        console.error("Failed to fetch facility information", err)
      }
    },
    clearFacilities() {
      this.userFacilities = {};
    },

    async updateRerouteFulfillmentConfig(payload: any): Promise<any> {
      return api({
        url: `admin/productStores/${payload.productStoreId}/settings`,
        method: "post",
        data: payload
      });
    },
    async fetchShopifyShopLocation(payload: { shopifyLocationId: string, pageSize: number }): Promise<any> {
      try {
        const resp = await api({ url: "oms/shopifyShops/locations", method: "GET", params: payload }) as any;
        return Promise.resolve(resp.data[0]?.facilityId)
      } catch(error) {
        return Promise.reject({ code: "error", message: "Failed to fetch location information", serverResponse: error })
      }
    },
  },
  persist: true
})
