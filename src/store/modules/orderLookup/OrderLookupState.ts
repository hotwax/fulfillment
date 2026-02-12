export default interface OrderLookupState {
  list: {
    orders: any[],
    orderCount: number,
    itemCount: number
  };
  query: any;
  current: any;
  channels: any;
  productStores: any;
  orderStatuses: any;
  carriersTrackingInfo: any
}