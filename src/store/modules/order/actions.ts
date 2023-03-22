import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import emitter from '@/event-bus'
import { OrderService } from '@/services/OrderService'
import { hasError } from '@/utils'
import * as types from './mutation-types'
import { prepareOrderQuery } from '@/utils/solrHelper'
import { UtilService } from '@/services/UtilService'


const actions: ActionTree<OrderState, RootState> = {

  // get in-progress orders
  async fetchInProgressOrders ({ commit, state }, payload) {
    emitter.emit('presentLoader');
    let resp;

    // preparing filters separately those are based on some condition
    const filters = {} as any
    if(state.selectedPicklists.length) {
      filters['picklistId'] = {value: state.selectedPicklists, op: 'OR'}
    }

    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      viewSize: this.state.util.viewSize,
      queryFields: 'productId productName virtualProductName orderId search_orderIdentifications productSku customerId customerName goodIdentifications',
      sort: 'orderDate asc',
      groupBy: 'picklistBinId',
      filters: {
        picklistItemStatusId: { value: 'PICKITEM_PENDING' },
        '-fulfillmentStatus': { value: 'Rejected' },
        '-shipmentMethodTypeId': { value: 'STOREPICKUP' },
        facilityId: { value: this.state.user.currentFacility.facilityId },
        ...filters
      }
    })

    try {
      resp = await OrderService.fetchInProgressOrders(orderQueryPayload);
      if (resp.status === 200 && resp.data.grouped?.picklistBinId.matches > 0 && !hasError(resp)) {
        const total = resp.data.grouped.picklistBinId.ngroups
        const orders = resp.data.grouped.picklistBinId.groups

        // using for loop as map does not supports working with async code
        for (const order of orders) {
          const shipmentInformation = await UtilService.fetchShipmentInformationForOrder(order.groupValue, order.doclist.docs[0].orderId)
          order.shipment = shipmentInformation.shipment;
          order.shipmentIds = shipmentInformation.shipmentIds;
        }

        // using flat to have the shipmentIds at a single level and then filtered the shipmentId to handle the case if we might not have the shipmentId available for an order
        const shipmentIds = orders.map((order: any) => order.shipmentIds).flat().filter((shipmentId: string) => shipmentId)

        // TODO: handle case when shipmentIds is empty
        const shipmentPackages = await UtilService.fetchShipmentPackages(shipmentIds)

        const availableShipmentIds = orders.map((order: any) => order.shipment.shipmentId).flat().filter((shipmentId: string) => shipmentId)

        const carrierPartyIdsByShipment = await UtilService.fetchCarrierPartyIdsForShipment(availableShipmentIds)

        const carrierPartyIds = [...new Set(Object.values(carrierPartyIdsByShipment).map((carrierPartyIds: any) => carrierPartyIds.map((carrier: any) => carrier.carrierPartyId)).flat())]

        const carrierShipmentBoxType = await UtilService.fetchCarrierShipmentBoxType(carrierPartyIds)

        orders.map((order: any) => {
          order.doclist.docs.map((item: any) => {
            // assigning segmentSelected at item level as we have option to change segment for each item
            item.segmentSelected = 'pack'
          })

          order['shipmentPackages'] = shipmentPackages[order.doclist.docs[0].orderId]
          order['carrierPartyIds'] = [...new Set(availableShipmentIds.map((id: any) => carrierPartyIdsByShipment[id].map((carrierParty: any) => carrierParty.carrierPartyId)).flat())]

          order['shipmentBoxTypeByCarrierParty'] = order['carrierPartyIds'].reduce((shipmentBoxType: any, carrierPartyId: string) => {
            if(shipmentBoxType[carrierPartyId]) {
              shipmentBoxType[carrierPartyId].push(carrierShipmentBoxType[carrierPartyId])
            } else {
              shipmentBoxType[carrierPartyId] = carrierShipmentBoxType[carrierPartyId]
            }

            return shipmentBoxType
          }, {})
        })

        commit(types.ORDER_INPROGRESS_UPDATED, {orders, total})
        this.dispatch('product/getProductInformation', { orders })
      } else {
        console.error('No orders found')
      }
    } catch (err) {
      console.error('error', err)
    }

    emitter.emit('dismissLoader');
    return resp;
  },

  async clearOrders ({ commit }) {
    commit(types.ORDER_INPROGRESS_UPDATED, {orders: {}, total: 0})
  },

  updateSelectedPicklists({ state, commit }, picklistId) {
    const selectedPicklists = JSON.parse(JSON.stringify(state.selectedPicklists))

    if(selectedPicklists.includes(picklistId)) {
      selectedPicklists.splice(selectedPicklists.indexOf(picklistId), 1)
    } else {
      selectedPicklists.push(picklistId)
    }
    commit(types.ORDER_SELECTED_PICKLISTS_UPDATED, selectedPicklists)
  }
}

export default actions;