export default interface OrderState {
  open: {
    list: any,
    total: number,
    query: {
      viewIndex: number,
      viewSize: any,
      queryString: string,
      selectedShipmentMethods: Array<string>,
      selectedCategories: Array<string>
    }
  },
  completed: {
    list: any,
    total: number,
    query: {
      viewIndex: number,
      viewSize: any,
      queryString: string,
      selectedCarrierPartyId: string,
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
  },
  current: any,
  
}