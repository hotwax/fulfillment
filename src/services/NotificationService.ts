import { api } from "@common";
import { hasError } from "@common/utils/commonUtil";

async function getNotificationEnumIds(enumTypeId: string): Promise<any> {
  const params = {
    enumTypeId,
    pageSize: 200
  }

  try {
    const resp = await api({
      url: "admin/enums",
      method: "get",
      params
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

async function getNotificationUserPrefTypeIds(applicationId: string, userId: string, filterConditions = {}): Promise<any> {
  const params = {
    topicTypeId: applicationId,
    userId,
    pageSize: 200,
    ...filterConditions
  }

  try {
    const resp = await api({
      url: "firebase/user/notificationtopic",
      method: "get",
      params
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

async function storeClientRegistrationToken(registrationToken: string, deviceId: string, applicationId: string): Promise<any> {
  const payload = {
    registrationToken,
    deviceId,
    applicationId
  }

  try {
    const resp = await api({
      url: "firebase/token",
      method: "post",
      data: payload
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

async function removeClientRegistrationToken(deviceId: string, applicationId: string): Promise<any> {
  const params = {
    deviceId,
    applicationId
  }

  try {
    const resp = await api({
      url: "firebase/token",
      method: "delete",
      params
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

async function subscribeTopic(topicName: string, applicationId: string): Promise<any> {
  const params = {
    topicName,
    applicationId
  }

  try {
    const resp = await api({
      url: "firebase/topic",
      method: "post",
      data: params
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

async function unsubscribeTopic(topicName: string, applicationId: string): Promise<any> {
  const params = {
    topicName,
    applicationId
  }

  try {
    const resp = await api({
      url: "firebase/topic",
      method: "delete",
      data: params
    }) as any;

    if (!hasError(resp)) {
      return Promise.resolve(resp.data);
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    });
  }
}

export const NotificationService = {
  getNotificationEnumIds,
  getNotificationUserPrefTypeIds,
  removeClientRegistrationToken,
  storeClientRegistrationToken,
  subscribeTopic,
  unsubscribeTopic
}
