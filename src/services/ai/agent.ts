import { generateText, streamText, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { orderTools } from './orderTools';

const key = process.env.VUE_APP_GOOGLE_AI_API_KEY;
const google = createGoogleGenerativeAI({
    apiKey: key
});

const modelName = "amazon.nova-pro-v1:0"

/**
 * Base AI Agent Configuration
 */
export const fulfillmentAgent = {
    system: `You are a helpful assistant for the Fulfillment PWA. 
  You help users manage orders, manifests, and inventory. 
  Be concise and professional in your responses.
  IMPORTANT: After every tool call, you MUST provide a human-readable summary. 
  If you just received order data, list the order ID, status, and items for the user.
  DO NOT STOP until you have provided a text response to the user.`,
};

/**
 * Helper to chat with the agent via local AI SDK
 */
export async function chatWithAgent(messages: any[]) {
    const result = await generateText({
        model: google(modelName),
        system: fulfillmentAgent.system,
        tools: orderTools as any,
        stopWhen: stepCountIs(10),
        messages,
    } as any);

    return result.text;
}

export async function streamWithAgent(messages: any[]) {
    return streamText({
        model: google(modelName),
        system: fulfillmentAgent.system,
        tools: orderTools as any,
        stopWhen: stepCountIs(10),
        messages,
        onFinish: (event: any) => {
            // event contains usage and final text if needed
        },
        onError: (error: any) => {
            console.error('AI SDK Error:', error);
        }
    } as any);
}
