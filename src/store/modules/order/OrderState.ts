export default interface OrderState {
  open: {
    list: any,
    total: number,
    viewSize: number,
    queryString: string
  }
  selectedShipmentMethods: Array<string>;
}