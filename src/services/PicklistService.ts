import { api } from '@/adapter';

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: 'warehouse-party',
    method: 'POST',
    data: query
  })
}

const createPicklist = async (query: any): Promise <any> => {
  return api({
    url: 'createPicklist',
    method: 'POST',
    data: query
  })
}

export const PicklistService = {
  createPicklist,
  getAvailablePickers
}