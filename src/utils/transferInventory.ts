export interface TransferInventoryLine {
  productId: string
  quantity: number | string
}

export type TransferInventoryValidation = { status: "valid" } |
  { status: "missing"; productId: string } |
  { status: "insufficient"; productId: string; quantity: number; onHand: number }

export function validateTransferInventory(lines: TransferInventoryLine[], stockByProduct: Record<string, any>): TransferInventoryValidation {
  const quantityByProduct = new Map<string, number>()

  lines.forEach((line) => {
    const quantity = Number(line.quantity)
    if(!line.productId || !Number.isFinite(quantity) || quantity <= 0) {
      return
    }

    quantityByProduct.set(line.productId, (quantityByProduct.get(line.productId) || 0) + quantity)
  })

  for(const [productId, quantity] of quantityByProduct) {
    const rawOnHand = stockByProduct[productId]?.qoh
    if(rawOnHand === null || rawOnHand === undefined || rawOnHand === "") {
      return { status: "missing", productId }
    }

    const onHand = Number(rawOnHand)
    if(!Number.isFinite(onHand)) {
      return { status: "missing", productId }
    }
    if(quantity > onHand) {
      return { status: "insufficient", productId, quantity, onHand }
    }
  }

  return { status: "valid" }
}
