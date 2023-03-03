export default interface OrderState {
  inProgress: {
    list: any,
    total: number,
  },
  selectedPicklists: Array<string>,
  queryString: string
}