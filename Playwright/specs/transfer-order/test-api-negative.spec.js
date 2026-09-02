import { test, expect } from "@playwright/test";

import fs from "fs";
import path from "path";

test.describe("API Negative Tests - Transfer Orders", () => {
  let token;
  let maargBaseUrl;

  test.beforeEach(async ({}, testInfo) => {
    const storageStatePath = testInfo.project.use.storageState;
    if (!storageStatePath) throw new Error("No storageState configured for this project");
    
    // Read the storage state file directly
    const authFilePath = path.resolve(process.cwd(), storageStatePath);
    if (!fs.existsSync(authFilePath)) {
      throw new Error(`Auth file not found at ${authFilePath}`);
    }
    
    const authData = JSON.parse(fs.readFileSync(authFilePath, "utf8"));
    
    // Search across cookies for the token and maargOms
    for (const cookie of authData.cookies || []) {
      if (cookie.name === 'token') token = cookie.value;
      if (cookie.name === 'maarg') maargBaseUrl = decodeURIComponent(cookie.value);
    }
    
    // Fallback to localStorage for backward compatibility
    if (!token || !maargBaseUrl) {
      for (const origin of authData.origins || []) {
        for (const item of origin.localStorage || []) {
          try {
            const parsed = JSON.parse(item.value);
            if (parsed.token?.value) token = token || parsed.token.value;
            if (parsed.maargOms) maargBaseUrl = maargBaseUrl || parsed.maargOms;
          } catch (e) {
            // ignore parse errors for non-JSON items
          }
        }
      }
    }
    
    if (!token) throw new Error("Authentication token not found in auth file");
  });

  test("Verify endpoints without /api/", async ({ request }) => {
    const orderId = "KREWE37831";
    
    // 1. Test poorti reject without /api/
    const urlPoorti = `${maargBaseUrl}/poorti/transferOrders/${orderId}/reject`;
    console.log(`API [Endpoint: ${urlPoorti}] - Sending POST request`);
    let response = await request.post(urlPoorti, {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      data: { rejectReasonId: "SYSTEM_ERROR" }
    });
    console.log(`API [Status: ${response.status()}] - Received response`);
    console.log(`API [Body: ${await response.text()}] - Response body`);

    // 2. Test oms cancel without /api/
    const urlOms = `${maargBaseUrl}/oms/transferOrders/${orderId}/cancel`;
    console.log(`API [Endpoint: ${urlOms}] - Sending POST request`);
    response = await request.post(urlOms, {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
    });
    console.log(`API [Status: ${response.status()}] - Received response`);
    console.log(`API [Body: ${await response.text()}] - Response body`);
  });

  test("Discard Order API - Invalid Order ID", async ({ request }) => {
    const invalidOrderId = "INVALID_ORDER_ID_12345";
    
    // Using maargBaseUrl as per TransferOrderService (baseURL for oms/transferOrders/${orderId}/cancel is Maarg URL)
    const url = `${maargBaseUrl}/api/oms/transferOrders/${invalidOrderId}/cancel`;

    console.log(`API [Endpoint: ${url}] - Sending POST request`);
    const response = await request.post(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`API [Status: ${response.status()}] - Discard response received`);
    const body = await response.text();
    console.log(`API [Body: ${body}] - Discard response body`);

    // Expecting 400 or 404, not 500
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("Ship Later API - Empty Shipment Payload", async ({ request }) => {
    // TransferOrderService.createOutboundTransferShipment calls poorti/transferShipments
    const url = `${maargBaseUrl}/api/poorti/transferShipments`;

    console.log(`API [Endpoint: ${url}] - Sending POST request`);
    const response = await request.post(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      data: {
        "items": [] // empty items
      }
    });

    console.log(`API [Status: ${response.status()}] - Ship later response received`);
    const body = await response.text();
    console.log(`API [Body: ${body}] - Ship later response body`);

    // Expecting 400 Bad Request
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("Ship Order API - Invalid Shipment ID", async ({ request }) => {
    const invalidShipmentId = "INVALID_SHIPMENT_ID";
    // TransferOrderService.shipTransferOrderShipment calls poorti/transferShipments/${shipmentId}/ship
    const url = `${maargBaseUrl}/api/poorti/transferShipments/${invalidShipmentId}/ship`;

    console.log(`API [Endpoint: ${url}] - Sending POST request`);
    const response = await request.post(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      data: {
        "shipmentId": invalidShipmentId
      }
    });

    console.log(`API [Status: ${response.status()}] - Ship order response received`);
    const body = await response.text();
    console.log(`API [Body: ${body}] - Ship order response body`);

    // Expecting 400 or 404
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
