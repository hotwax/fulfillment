import { api, apiClient, hasError } from '@/adapter';
import store from '@/store';
import logger from '@/logger';

/**
 * AI Service
 * Handles communication with the backend AI endpoints.
 */
const chat = async (payload: { prompt: string, messages?: any[] }): Promise<any> => {
    const omstoken = store.getters['user/getUserToken'];
    const baseURL = store.getters['user/getMaargBaseUrl'];

    try {
        const resp = await apiClient({
            url: "/oms/ai/chat", // Placeholder endpoint
            method: "POST",
            baseURL,
            headers: {
                "Authorization": "Bearer " + omstoken,
                "Content-Type": "application/json"
            },
            data: payload,
        });

        if (hasError(resp)) {
            throw resp.data;
        }
        return resp.data;
    } catch (err) {
        logger.error("AI Chat failed", err);
        throw err;
    }
}

const streamChat = async (payload: { prompt: string, messages?: any[] }): Promise<any> => {
    const omstoken = store.getters['user/getUserToken'];
    const baseURL = store.getters['user/getMaargBaseUrl'];

    // Note: Streaming via apiClient (axios) might need specific config for SSE
    // This is a placeholder for how one might call a streaming endpoint
    return apiClient({
        url: "/oms/ai/streamChat", // Placeholder endpoint
        method: "POST",
        baseURL,
        headers: {
            "Authorization": "Bearer " + omstoken,
            "Content-Type": "application/json"
        },
        data: payload,
        responseType: 'stream' // Browser support for 'stream' varies, usually 'blob' or Fetch API is used
    });
}

export const AiService = {
    chat,
    streamChat
}
