export default interface OrderState {
    stats:{
      total: number,
      rejectedItems: any,
      usedReasons: any,
    },
    rejectedOrders: {
      list: any,
      total: number,
      query: {
        viewIndex: number,
        viewSize: any,
        queryString: string,
        rejectionPeriodId: string,
        rejectionReasons: any
      }
    }
  }