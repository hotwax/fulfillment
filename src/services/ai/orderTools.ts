import { tool } from 'ai';
import { z } from 'zod';
import { OrderService } from '../OrderService';

export const orderTools = {
    get_order_details: tool({
        description: 'Get the details of a specific order by its ID',
        parameters: z.object({
            order_id: z.string().min(1).describe('The ID of the order to fetch details for'),
        }),
        execute: async ({ order_id }: { order_id: string }) => {
            try {
                const details = await OrderService.fetchOrderDetail(String(order_id));
                if (!details) return "No order found with that ID.";
                return details;
            } catch (error) {
                console.error('Error in get_order_details tool:', error);
                return `Error fetching order details: ${error}`;
            }
        },
    } as any),
};
