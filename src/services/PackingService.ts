
/**
 * PackingService handles communication with the AI-driven packing agent.
 */
class PackingService {
    /**
     * Requests a packing plan from the AI agent based on items and available boxes.
     * @param items Array of items with dimensions and quantities
     * @param availableBoxes Array of box types available for packing
     * @returns Detailed packing plan including box assignments and summary
     */
    static async getPackingPlan(items: any[], availableBoxes: any[]): Promise<any> {
        const itemDetails = items.map(item => `${item.quantity}x ${item.id} (${item.width}x${item.height}x${item.depth}, ${item.weight}lbs)`).join(', ');
        const boxDetails = availableBoxes.map(box => `${box.id} (${box.width}x${box.height}x${box.depth})`).join(', ');

        const prompt = `Finding the optimal packing plan for these items: ${itemDetails}. 
    Using these available box types (LxWxH): ${boxDetails}. 
    Minimize the total number of boxes used. If an item doesn't fit in any box, report it in the summary.
    Return a structured plan with:
    1. A list of boxes used, including boxType, dimensions, items packed, and efficiency.
    2. totalBoxes count.
    3. A clear summary of the result.`;

        try {
            // Direct fetch to Mastra agent running on port 4111
            const response = await fetch('http://localhost:4111/api/agents/packinghelper/packing-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error(`Agent returned status ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching AI packing plan:', error);
            throw error;
        }
    }
}

export { PackingService };
