import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/utils'
import logger from '@/logger'

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    let rejectReasons  = [];
    try {
      const payload = {
        "inputFields": {
          "parentEnumTypeId": "REPORT_AN_ISSUE"
        },
        "fieldList": ["enumCode", "description"],
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
    const partyInformation = JSON.parse(JSON.stringify(state.partyNames))
    const cachedPartyIds = Object.keys(partyInformation);
    const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

    if(!ids.length) return;

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

          const partyName = []
          partyInformation.firstName && (partyName.push(partyInformation.firstName))
          partyInformation.middleName && (partyName.push(partyInformation.middleName))
          partyInformation.lastName && (partyName.push(partyInformation.lastName))
          partyInformation.groupName && (partyName.push(partyInformation.groupName))

          partyResp[partyInformation.partyId] = partyName.join(' ')
        })
        commit(types.UTIL_PARTY_NAMES_UPDATED, {
          ...partyInformation,
          ...partyResp
        })
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching party information', err)
    }
  },

  async fetchShipmentMethodTypeDesc({ commit, state }, shipmentIds) {
    const shipmentMethodTypeDesc = JSON.parse(JSON.stringify(state.shipmentMethodTypeDesc))
    const cachedShipmentMethodIds = Object.keys(shipmentMethodTypeDesc);
    const ids = shipmentIds.filter((shipmentId: string) => !cachedShipmentMethodIds.includes(shipmentId))

    if(!ids.length) return;

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
        commit(types.UTIL_SHIPMENT_METHODS_UPDATED, {
          ...shipmentMethodTypeDesc,
          ...shipmentMethodResp
        })
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching shipment description', err)
    }
  }
}

export default actions;