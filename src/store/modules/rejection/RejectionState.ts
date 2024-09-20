export default interface OrderState {
    rejectedItems: any,
    usedReasons: any,
    rejectedOrders: {
      list: any,
      total: number,
      query: {
        viewIndex: number,
        viewSize: any,
        queryString: string,
        rejectionPeriodId: string
      }
    }
  }