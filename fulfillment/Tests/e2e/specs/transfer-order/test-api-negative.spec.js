import { test, expect } from "@playwright/test";

import fs from "fs";
import path from "path";

test.describe("API Negative Tests - Transfer Orders", () => {
  let token;
  let maargBaseUrl;

  test.beforeEach(async () => {
    // Read the storage state file directly
    const authFilePath = path.resolve(__dirname, "../../.auth/krewe-uat.user.json");
    if (!fs.existsSync(authFilePath)) {
      throw new Error(`Auth file not found at ${authFilePath}`);
    }
    
    const authData = JSON.parse(fs.readFileSync(authFilePath, "utf8"));
    
    // Search across all origins and localStorage entries for the token and maargOms
    for (const origin of authData.origins || []) {
      for (const item of origin.localStorage || []) {
        try {
          const parsed = JSON.parse(item.value);
          if (parsed.token?.value && parsed.maargOms) {
            token = parsed.token.value;
            maargBaseUrl = parsed.maargOms;
            break;
          }
        } catch (e) {
          // ignore parse errors for non-JSON items
        }
      }
      if (token) break;
    }
    
    if (!token) throw new Error("Authentication token not found in auth file");
  });

  test.only("Verify endpoints without /api/", async ({ request }) => {
    const orderId = "KREWE37831";
    
    // 1. Test poorti reject without /api/
    const urlPoorti = `${maargBaseUrl}/poorti/transferOrders/${orderId}/reject`;
    console.log(`Sending POST to: ${urlPoorti}`);
    let response = await request.post(urlPoorti, {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      data: { rejectReasonId: "SYSTEM_ERROR" }
    });
    console.log(`Response Status: ${response.status()}`);
    console.log(`Response Body: ${await response.text()}`);

    // 2. Test oms cancel without /api/
    const urlOms = `${maargBaseUrl}/oms/transferOrders/${orderId}/cancel`;
    console.log(`Sending POST to: ${urlOms}`);
    response = await request.post(urlOms, {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
    });
    console.log(`Response Status: ${response.status()}`);
    console.log(`Response Body: ${await response.text()}`);
  });

  test("Discard Order API - Invalid Order ID", async ({ request }) => {
    const invalidOrderId = "INVALID_ORDER_ID_12345";
    
    // Using maargBaseUrl as per TransferOrderService (baseURL for oms/transferOrders/${orderId}/cancel is Maarg URL)
    const url = `${maargBaseUrl}/api/oms/transferOrders/${invalidOrderId}/cancel`;

    console.log(`Sending POST to ${url}`);
    const response = await request.post(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`Discard API Response Status: ${response.status()}`);
    const body = await response.text();
    console.log(`Discard API Response Body: ${body}`);

    // Expecting 400 or 404, not 500
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("Ship Later API - Empty Shipment Payload", async ({ request }) => {
    // TransferOrderService.createOutboundTransferShipment calls poorti/transferShipments
    const url = `${maargBaseUrl}/api/poorti/transferShipments`;

    console.log(`Sending POST to ${url}`);
    const response = await request.post(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      data: {
        "items": [] // empty items
      }
    });

    console.log(`Ship Later API Response Status: ${response.status()}`);
    const body = await response.text();
    console.log(`Ship Later API Response Body: ${body}`);

    // Expecting 400 Bad Request
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("Ship Order API - Invalid Shipment ID", async ({ request }) => {
    const invalidShipmentId = "INVALID_SHIPMENT_ID";
    // TransferOrderService.shipTransferOrderShipment calls poorti/transferShipments/${shipmentId}/ship
    const url = `${maargBaseUrl}/api/poorti/transferShipments/${invalidShipmentId}/ship`;

    console.log(`Sending POST to ${url}`);
    const response = await request.post(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      data: {
        "shipmentId": invalidShipmentId
      }
    });

    console.log(`Ship Order API Response Status: ${response.status()}`);
    const body = await response.text();
    console.log(`Ship Order API Response Body: ${body}`);

    // Expecting 400 or 404
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
