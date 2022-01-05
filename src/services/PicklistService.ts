import api from "@/api"

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: 'warehouse-party',
    method: 'POST',
    data: query
  })
}

export const PicklistService = {
  getAvailablePickers
}