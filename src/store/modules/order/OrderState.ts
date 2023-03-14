export default interface OrderState {
  open: {
    list: any,
    total: number
  }
  selectedShipmentMethods: Array<string>;
  queryString: string;
}