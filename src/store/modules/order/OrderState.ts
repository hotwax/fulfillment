export default interface OrderState {
  current: any,
  open: {
    list: any,
    total: number,
    query: {
      viewIndex: number,
      viewSize: any,
      queryString: string,
      selectedShipmentMethods: Array<string>
    }
  },
  completed: {
    list: any,
    total: number,
    query: {
      viewIndex: number,
      viewSize: any,
      queryString: string,
      selectedCarrierPartyIds: Array<string>,
      selectedShipmentMethods: Array<string>
    }
  },  
  inProgress: {
    list: any,
    total: number,
    query: {
      viewIndex: number,
      viewSize: any,
      selectedPicklist: string,
      queryString: string
    }
  }
}