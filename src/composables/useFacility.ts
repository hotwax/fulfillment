import { api, commonUtil, logger } from '@common';
import { useUserStore } from "@/store/user";

const getFacilityDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}`,
    method: "GET",
    params: payload
  });
}

const getFacilityOrderCount = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/facilityOrderCounts`,
    method: "GET",
    params: payload
  });
}

const updateFacility = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}`,
    method: "PUT",
    data: payload
  });
}

const updateFacilityToGroup = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}/groups`,
    method: "POST",
    data: payload
  });
}

const addFacilityToGroup = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilities/${payload.facilityId}/groups`,
    method: "POST",
    data: payload
  });
}

const getFacilityGroupDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilityGroups`,
    method: "get",
    params: payload
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  return api({
    url: "/oms/facilities",
    method: "GET",
    params: payload
  });
}

const fetchProductStoreFacilities = async (): Promise<any> => {
  try {
    const productStoreId = useUserStore().getCurrentEComStore?.productStoreId;

    if (!productStoreId) {
      logger.error('Product store ID not found');
      return [];
    }

    // Define parameters before API call
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
}

const fetchFacilityAddresses = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/facilityContactMechs`,
    method: "GET",
    params: payload,
  });
}

const fetchFacilityZPLGroupInfo = async (): Promise<any> => {
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
}

const getFacilityGroupAndMemberDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/dataDocumentView`,
    method: "post",
    data: payload
  });
}

const fetchFacilityTypeInformation = async (query: any): Promise<any> => {
  return api({
    url: `/oms/facilities`,
    method: "GET",
    params: query,
  });
}

export const useFacility = () => {
  return {
    addFacilityToGroup,
    fetchFacilities,
    fetchFacilityAddresses,
    fetchFacilityTypeInformation,
    fetchFacilityZPLGroupInfo,
    fetchProductStoreFacilities,
    getFacilityDetails,
    getFacilityOrderCount,
    getFacilityGroupDetails,
    getFacilityGroupAndMemberDetails,
    updateFacility,
    updateFacilityToGroup
  }
}
