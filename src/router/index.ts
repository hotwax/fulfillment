import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Completed from '@/views/Completed.vue'
import InProgress from '@/views/InProgress.vue'
import OpenOrders from "@/views/OpenOrders.vue"
import Settings from "@/views/Settings.vue"
import RejectionReasons from '@/views/RejectionReasons.vue';
import Carriers from '@/views/Carriers.vue'
import CarrierDetail from '@/views/CarrierDetail.vue'
import OrderDetail from "@/views/OrderDetail.vue"
import TransferOrders from "@/views/TransferOrders.vue"
import TransferOrderDetail from "@/views/TransferOrderDetail.vue"
import CreateCarrier from "@/views/CreateCarrier.vue"
import CarrierShipmentMethods from "@/views/CarrierShipmentMethods.vue"
import { commonUtil } from "@common/utils/commonUtil"
import { useUserStore } from '@/store/user'
import { translate } from "@common";
import { useUserStore as useDxpUserStore } from "@/store/user";
import 'vue-router'
import Notifications from '@/views/Notifications.vue'
import CreateTransferOrder from '@/views/CreateTransferOrder.vue';
import ShipTransferOrder from '@/views/ShipTransferOrder.vue';

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}
import { useAuth } from '@/composables/auth';
import Login from '@/views/Login.vue';
import OrderLookup from '@/views/OrderLookup.vue';
import OrderLookupDetail from '@/views/OrderLookupDetail.vue';
import Rejections from '@/views/Rejections.vue';
import Shopify from '@/views/Shopify.vue';

const authGuard = async (to: any, from: any, next: any) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    next('/login');
  } else {
    next()
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated.value && !to.query?.token && !to.query?.oms) {
    next('/')
  }
  next();
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/open'
  },
  {
    path: '/open',
    name: 'OpenOrders',
    component: OpenOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/in-progress',
    name: 'InProgress',
    component: InProgress,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/completed',
    name: 'Completed',
    component: Completed,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/transfer-orders',
    name: 'Transfer Orders',
    component: TransferOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "ORD_TRANSFER_ORDER_VIEW OR ORD_TRANSFER_ORDER_ADMIN"
    }
  },
  {
    path: '/create-transfer-order/:orderId',
    name: 'CreateTransferOrder',
    component: CreateTransferOrder,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/ship-transfer-order/:shipmentId',
    name: 'ShipTransferOrder',
    component: ShipTransferOrder,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/transfer-order-details/:orderId/:category',
    name: 'TransferOrderDetail',
    component: TransferOrderDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "ORD_TRANSFER_ORDER_VIEW OR ORD_TRANSFER_ORDER_ADMIN"
    }
  },
  {
    path: '/transfer-order-details/:orderId/ship-transfer-order/:shipmentId',
    name: 'ShipTransferOrderFromOrderDetail',
    component: ShipTransferOrder,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/:category/order-detail/:orderId/:shipGroupSeqId',
    name: 'OrderDetail',
    component: OrderDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/:category/shipment-detail/:orderId/:shipmentId',
    name: 'ShipmentDetail',
    component: OrderDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: loginGuard
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  },
  {
    path: "/rejection-reasons",
    name: "RejectionReasons",
    component: RejectionReasons,
    beforeEnter: authGuard,
    meta: {
      permissionId: "STOREFULFILLMENT_ADMIN"
    }
  },
  {
    path: "/order-lookup",
    name: "OrderLookup",
    component: OrderLookup,
    beforeEnter: authGuard,
    meta: {
      permissionId: "FF_ORDER_LOOKUP_VIEW"
    }
  },
  {
    path: "/order-lookup/:orderId",
    name: "OrderLookupDetail",
    component: OrderLookupDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "FF_ORDER_LOOKUP_VIEW"
    }
  },
  {
    path: "/carriers",
    name: "Carriers",
    component: Carriers,
    beforeEnter: authGuard,
    meta: {
      permissionId: "CARRIER_SETUP_VIEW"
    }
  },
  {
    path: '/create-carrier',
    name: 'CreateCarrier',
    component: CreateCarrier,
    beforeEnter: authGuard,
    meta: {
      permissionId: "CARRIER_SETUP_VIEW"
    }
  },
  {
    path: '/carrier-details/:partyId',
    name: 'CarrierDetail',
    component: CarrierDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "CARRIER_SETUP_VIEW"
    }
  },
  {
    path: '/shipment-methods-setup/:partyId',
    name: 'CarrierShipmentMethods',
    component: CarrierShipmentMethods,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "CARRIER_SETUP_VIEW"
    }
  },
  {
    path: '/notifications',
    name: "Notifications",
    component: Notifications,
    beforeEnter: authGuard,
  },
  {
    path: "/rejections",
    name: "Rejections",
    component: Rejections,
    beforeEnter: authGuard,
    meta: {
      permissionId: "STOREFULFILLMENT_ADMIN"
    }
  },
  {
    path: '/shopify',
    name: 'Shopify',
    component: Shopify
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes as any
})

router.beforeEach((to, from) => {
  const userStore = useUserStore()
  if (to.meta.permissionId && !userStore.hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else commonUtil.showToast(translate('You do not have permission to access this page'));
    return {
      path: redirectToPath,
    }
  }
})

export default router
