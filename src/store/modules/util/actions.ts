import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    let rejectReasons  = [];
    try {
      const payload = {
        "inputFields": {
          "parentEnumTypeId": "REPORT_AN_ISSUE"
        },
        "fieldList": ["enumId", "description"],
        "distinct": "Y",
        "entityName": "EnumTypeChildAndEnum",
        "viewSize": 20 // keeping view size 20 as considering that we will have max 20 reasons
      }

      const resp = await UtilService.fetchRejectReasons(payload)

      if(!hasError(resp) && resp.data.count > 0) {
        rejectReasons = resp.data.docs
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch reject reasons', err)
    }

    commit(types.UTIL_REJECT_REASONS_UPDATED, rejectReasons)
  },

  async fetchPartyInformation({ commit, state }, partyIds) {
    let partyInformation = JSON.parse(JSON.stringify(state.partyNames))
    const cachedPartyIds = Object.keys(partyInformation);
    const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

    if(!ids.length) return partyInformation;

    try {
      const payload = {
        "inputFields": {
          "partyId": ids,
          "partyId_op": "in"
        },
        "fieldList": ["firstName", "middleName", "lastName", "groupName", "partyId"],
        "entityName": "PartyNameView",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchPartyInformation(payload);

      if(!hasError(resp)) {
        const partyResp = {} as any
        resp.data.docs.map((partyInformation: any) => {

          let partyName = ''
          if(partyInformation.groupName) {
            partyName = partyInformation.groupName
          } else {
            partyName = [partyInformation.firstName, partyInformation.lastName].join(' ')
          }

          partyResp[partyInformation.partyId] = partyName
        })

        partyInformation = {
          ...partyInformation,
          ...partyResp
        }

        commit(types.UTIL_PARTY_NAMES_UPDATED, partyInformation)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching party information', err)
    }

    return partyInformation;
  },

  async fetchShipmentMethodTypeDesc({ commit, state }, shipmentIds) {
    let shipmentMethodTypeDesc = JSON.parse(JSON.stringify(state.shipmentMethodTypeDesc))
    const cachedShipmentMethodIds = Object.keys(shipmentMethodTypeDesc);
    const ids = shipmentIds.filter((shipmentId: string) => !cachedShipmentMethodIds.includes(shipmentId))

    if(!ids.length) return shipmentMethodTypeDesc;

    try {
      const payload = {
        "inputFields": {
          "shipmentMethodTypeId": ids,
          "shipmentMethodTypeId_op": "in"
        },
        "fieldList": ["shipmentMethodTypeId", "description"],
        "entityName": "ShipmentMethodType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchShipmentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        const shipmentMethodResp = {} as any
        resp.data.docs.map((shipmentMethodInformation: any) => {
          shipmentMethodResp[shipmentMethodInformation.shipmentMethodTypeId] = shipmentMethodInformation.description
        })

        shipmentMethodTypeDesc = {
          ...shipmentMethodTypeDesc,
          ...shipmentMethodResp
        }

        commit(types.UTIL_SHIPMENT_METHODS_UPDATED, shipmentMethodTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching shipment description', err)
    }

    return shipmentMethodTypeDesc;
  }
}

export default actions;