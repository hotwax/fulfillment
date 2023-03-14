import OrderState from "./modules/order/OrderState";

export default interface RootState {
    user: any;
    product: any;
    picklist: any;
    order: OrderState;
}