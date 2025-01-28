import OrderState from "./modules/order/OrderState";
import UtilState from "./modules/util/UtilState";
import TransferOrderState from "./modules/transferorder/TransferOrderState";
import CarrierState from "./modules/carrier/CarrierState"
import RejectionState from "./modules/rejection/RejectionState"


export default interface RootState {
    user: any;
    product: any;
    util: UtilState;
    order: OrderState;
    transferOrder: TransferOrderState,
    carrier: CarrierState,
    rejectionState: RejectionState
}