import { describe, expect, it } from "vitest"

import { validateTransferInventory } from "@/utils/transferInventory"

describe("transfer inventory validation", () => {
  it("allows quantities at or below on hand", () => {
    expect(validateTransferInventory([
      { productId: "A", quantity: 3 },
      { productId: "B", quantity: 2 }
    ], {
      A: { qoh: 3 },
      B: { qoh: "4" }
    })).toEqual({ status: "valid" })
  })

  it("rejects a product whose total shipment quantity exceeds on hand", () => {
    expect(validateTransferInventory([
      { productId: "A", quantity: 2 },
      { productId: "A", quantity: 3 }
    ], {
      A: { qoh: 4 }
    })).toEqual({ status: "insufficient", productId: "A", quantity: 5, onHand: 4 })
  })

  it("does not treat missing stock as zero", () => {
    expect(validateTransferInventory([
      { productId: "A", quantity: 1 }
    ], {})).toEqual({ status: "missing", productId: "A" })
  })
})
