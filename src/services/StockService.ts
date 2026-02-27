import { apiClient } from '@/adapter';
import { useUserStore } from "@/store/user";

const getAuth = () => {
  const userStore = useUserStore();
  return {
    omstoken: userStore.getUserToken,
    baseURL: userStore.getMaargBaseUrl
  };
};

const getInventoryAvailableByFacility = async (query: any): Promise <any> => {
  const { omstoken, baseURL } = getAuth();

  return apiClient({
    url: `/poorti/getInventoryAvailableByFacility`,
    method: "GET",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query,
  });
}

export const StockService = {
  getInventoryAvailableByFacility
}
