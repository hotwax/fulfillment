export default interface OrderState {
  open: {
    list: any,
    total: number,
    viewSize: number,
  }
  selectedShipmentMethods: Array<string>;
  queryString: string;
}