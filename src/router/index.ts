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
import { translate, commonUtil, useAuth, ShopifyLogin, ShopifyAppInstall, Login } from '@common'
import { useUserStore } from '@/store/user'
import 'vue-router'
import Notifications from '@/views/Notifications.vue'
import CreateTransferOrder from '@/views/CreateTransferOrder.vue';
import ShipTransferOrder from '@/views/ShipTransferOrder.vue';

import { businessOutline, mailUnreadOutline, mailOpenOutline, checkmarkDoneOutline, settingsOutline } from "ionicons/icons";
import OrderLookup from '@/views/OrderLookup.vue';
import OrderLookupDetail from '@/views/OrderLookupDetail.vue';
import Rejections from '@/views/Rejections.vue';
import Actions from "@/authorization/actions";

const authGuard = async (to: any, from: any, next: any) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    if (!commonUtil.isAppEmbedded()) next('/login')
    else next('/shopify-login')
  } else {
    next()
  }
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
      permissionId: Actions.APP_OPEN_ORDERS_VIEW,
      title: "Open",
      icon: mailUnreadOutline,
      menuIndex: 1,
      childRoutes: ["/open/"]
    }
  },
  {
    path: '/in-progress',
    name: 'InProgress',
    component: InProgress,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_IN_PROGRESS_ORDERS_VIEW,
      title: "In Progress",
      icon: mailOpenOutline,
      menuIndex: 2,
      childRoutes: ["/in-progress/"]
    }
  },
  {
    path: '/completed',
    name: 'Completed',
    component: Completed,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_COMPLETED_ORDERS_VIEW,
      title: "Completed",
      icon: checkmarkDoneOutline,
      menuIndex: 3,
      childRoutes: ["/completed/"]
    }
  },
  {
    path: '/transfer-orders',
    name: 'Transfer Orders',
    component: TransferOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_TRANSFER_ORDERS_VIEW,
      title: "Transfer Orders",
      icon: businessOutline,
      menuIndex: 4,
      childRoutes: ["/transfer-order-details", "/create-transfer-order", "/ship-transfer-order"]
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
      permissionId: Actions.APP_TRANSFER_ORDER_DETAIL_VIEW
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
      permissionId: Actions.APP_ORDER_DETAIL_VIEW
    }
  },
  {
    path: '/:category/shipment-detail/:orderId/:shipmentId',
    name: 'ShipmentDetail',
    component: OrderDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_SHIPMENT_DETAIL_VIEW
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard,
    meta: {
      title: "Settings",
      icon: settingsOutline,
      menuIndex: 5
    }
  },

  {
    path: "/rejection-reasons",
    name: "RejectionReasons",
    component: RejectionReasons,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_REJECTION_REASONS_VIEW,
      title: "Rejection reasons",
      menuIndex: 6,
      groupMenuName: "Organization",
      childRoutes: ["/rejection-reasons/"]
    }
  },
  {
    path: "/order-lookup",
    name: "OrderLookup",
    component: OrderLookup,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_ORDER_LOOKUP_VIEW,
      title: "Order Lookup",
      menuIndex: 8,
      groupMenuName: "Organization",
      childRoutes: ["/order-lookup/"]
    }
  },
  {
    path: "/order-lookup/:orderId",
    name: "OrderLookupDetail",
    component: OrderLookupDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_ORDER_LOOKUP_VIEW
    }
  },
  {
    path: "/carriers",
    name: "Carriers",
    component: Carriers,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_CARRIERS_VIEW,
      title: "Carriers & Shipment Methods",
      menuIndex: 7,
      groupMenuName: "Organization",
      childRoutes: ["/carrier-details"]
    }
  },
  {
    path: '/create-carrier',
    name: 'CreateCarrier',
    component: CreateCarrier,
    beforeEnter: authGuard,
    meta: {
      permissionId: Actions.APP_CARRIERS_CREATE
    }
  },
  {
    path: '/carrier-details/:partyId',
    name: 'CarrierDetail',
    component: CarrierDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_CARRIERS_VIEW
    }
  },
  {
    path: '/shipment-methods-setup/:partyId',
    name: 'CarrierShipmentMethods',
    component: CarrierShipmentMethods,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: Actions.APP_CARRIERS_VIEW
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
      permissionId: Actions.APP_REJECTIONS_VIEW
    }
  },
  {
    path: '/shopify-app-install',
    name: 'ShopifyAppInstall',
    component: ShopifyAppInstall
  },
  {
    path: '/shopify-login',
    name: 'ShopifyLogin',
    component: ShopifyLogin
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes as any
})

router.beforeEach((to, from) => {
  // Enforce the canonical version URL on every navigation (no-op until the version is resolved, or if
  // already canonical). Redirect cancels this navigation. Logic lives in useAuth so it's shared.
  if (useAuth().checkAppVersionRedirect()) return false;

  if (to.meta.permissionId && !useUserStore().hasPermission(to.meta.permissionId as any)) {
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
