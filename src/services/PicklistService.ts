import api from "@/api"

const getAvailablePickers = async (query: any): Promise <any> => {
  console.log(query)
  return api({
    url: 'warehouse-party',
    method: 'POST',
    data: query
  })
}

export const PicklistService = {
  getAvailablePickers
}