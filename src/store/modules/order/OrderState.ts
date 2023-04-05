export default interface OrderState {
  open: {
    list: any,
    total: number,
    query: {
      viewSize: number,
      queryString: string,
      selectedShipmentMethods: Array<string>
    }
  },
  completed: {
    list: any,
    total: number,
    query: {
      viewSize: number,
      queryString: string,
      selectedCarrierPartyIds: Array<string>
    }
  }
}