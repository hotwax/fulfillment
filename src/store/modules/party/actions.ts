import { partyService } from "@/services/PartyService"
import { ActionTree } from "vuex"
import partyState from "./partyState"
import RootState from "@/store/RootState"
import * as types from './mutation-type'
import { hasError } from '@/adapter'
import logger from "@/logger"

const actions: ActionTree<partyState, RootState> = {
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
    
      const resp = await partyService.fetchPartyInformation(payload);
    
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
    
        commit(types.PRTY_PARTY_NAMES_UPDATED, partyInformation)
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Error fetching party information', err)
      }
    
    return partyInformation;
  },
}
export default actions;