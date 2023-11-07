import { ActionTree } from 'vuex'
import { translate } from "@hotwax/dxp-components";
import RootState from '@/store/RootState'
import TransferShipmentState from './TransferShipmentState'
import emitter from '@/event-bus'
import logger from "@/logger";
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import { showToast } from '@/utils';
import { TransferShipmentService } from '@/services/TransferShipmentService'


const actions: ActionTree<TransferShipmentState, RootState> = { 
  async findTransferShipments({ commit, state }) {
    emitter.emit('presentLoader');
    let resp;
    const shipmentsQuery = JSON.parse(JSON.stringify(state.shipments.query))

    const params = {
      "entityName": "ShipmentAndRouteSegment",
      "inputFields": {
        "originFacilityId": this.state.user.currentFacility.facilityId,
        "shipmentTypeId": "SALES_SHIPMENT"
      } as any,
      "fieldList": [ "shipmentId", "statusId", "createdDate", "estimatedShipDate", "originFacilityId", "destinationFacilityId", "destinationFacilityName", "shipmentMethodTypeId" ],
      "noConditionFind": "Y",
      "viewSize": shipmentsQuery.viewSize,
      "viewIndex": shipmentsQuery.viewIndex,
      "orderBy": "createdDate DESC"
    }

    if (shipmentsQuery.queryString) {
      params.inputFields["shipmentId_value"] = shipmentsQuery.queryString
      params.inputFields["shipmentId_op"] = 'contains'
      params.inputFields["shipmentId_ic"] = 'Y'
      params.inputFields["shipmentId_grp"] = '1'
      params.inputFields["externalId_value"] = shipmentsQuery.queryString
      params.inputFields["externalId_op"] = 'contains'
      params.inputFields["externalId_ic"] = 'Y'
      params.inputFields["externalId_grp"] = '2'
    }

    if (shipmentsQuery.selectedCarrierPartyIds.length) {
      params.inputFields["carrierPartyId"] = shipmentsQuery.selectedCarrierPartyIds
      params.inputFields["carrierPartyId_op"] = "in"
    }

    if (shipmentsQuery.selectedShipmentMethodTypeIds.length) {
      params.inputFields["shipmentMethodTypeId"] = shipmentsQuery.selectedShipmentMethodTypeIds
      params.inputFields["shipmentMethodTypeId_op"] = "in"
    }

    let transferShipments = [];
    let total = 0;

    try {
      resp = await TransferShipmentService.fetchTransferShipments(params);
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        total = resp.data.count
        transferShipments = resp.data.docs
        if (transferShipments) {
          this.dispatch('util/fetchTransferShipmentStatusDesc', [...new Set(transferShipments.map((shipment: any) => shipment.statusId))])
        }
        
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('No transfer shipments found', err)
    }

    commit(types.TRANSFER_SHIPMENT_UPDATED, {list: transferShipments, total})    
    emitter.emit('dismissLoader');
  },  

  async setCurrentShipment ({ commit, state }, payload) {
    let resp;
    try {
      let currentShipment = state.shipments.list.find((shipment:any) => shipment.shipmentId === payload?.shipmentId)

      resp = await TransferShipmentService.getShipmentDetail(payload);
      if (resp.status === 200 && resp.data.items && !hasError(resp)) {
        currentShipment = {
          ...currentShipment,
          ...resp.data
        }
      } else {
        throw resp.data
      }
      commit(types.TRANSFER_SHIPMENT_CURRENT_UPDATED, { currentShipment : currentShipment})
    } catch (err: any) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
  },

  async updateTransferShipmentQuery({ commit, dispatch }, payload) {
    commit(types.TRANSFER_SHIPMENT_QUERY_UPDATED, payload)
    await dispatch('findTransferShipments');
  },

  async updateTransferShipmentQueryIndex({ commit }, payload) {
    commit(types.TRANSFER_SHIPMENT_QUERY_UPDATED, payload)
  }
}

export default actions;
