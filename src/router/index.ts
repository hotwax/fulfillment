import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Completed from '@/views/Completed.vue'
import InProgress from '@/views/InProgress.vue'
import OpenOrders from "@/views/OpenOrders.vue"
import Settings from "@/views/Settings.vue"
import store from '@/store'
import Exim from "@/views/Exim.vue"
import UploadImportOrders from "@/views/UploadImportOrders.vue"
import DownloadPackedOrders from "@/views/DownloadPackedOrders.vue"
import OrderDetail from "@/views/OrderDetail.vue"
import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@hotwax/dxp-components'
import 'vue-router'

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}
import SavedMappings from "@/views/SavedMappings.vue"
import { useAuthStore, DxpLogin } from '@hotwax/dxp-components'
import { loader } from '@/utils/user';

const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated || !store.getters['user/isAuthenticated']) {
    await loader.present('Authenticating')
    // TODO use authenticate() when support is there
    const redirectUrl = window.location.origin + '/login'
    window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    loader.dismiss()
  }
  next()
};

const loginGuard = (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated && !to.query?.token && !to.query?.oms) {
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
      permissionId: "APP_OPEN_ORDERS_VIEW"
    }
  },
  {
    path: '/in-progress',
    name: 'InProgress',
    component: InProgress,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_IN_PROGRESS_ORDERS_VIEW"
    }
  },
  {
    path: '/completed',
    name: 'Completed',
    component: Completed,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_COMPLETED_ORDERS_VIEW"
    }
  },
  {
    path: '/:category/order-detail/:orderId/:shipGroupSeqId',
    name: 'OrderDetail',
    component: OrderDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: "APP_ORDER_DETAIL_VIEW"
    }
  },
  {
    path: "/exim",
    name: "EXIM",
    component: Exim,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_EXIM_VIEW"
    }
  },
  {
    path: "/upload-import-orders",
    name: "UploadImportOrders",
    component: UploadImportOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_UPLOAD_IMPORT_ORDERS_VIEW"
    }
  },
  {
    path: "/download-packed-orders",
    name: "DownloadPackedOrders",
    component: DownloadPackedOrders,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_DOWNLOAD_PACKED_ORDERS_VIEW"
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: DxpLogin,
    beforeEnter: loginGuard
  },
  {
    path: "/saved-mappings",
    name: "SavedMappings",
    component: SavedMappings,
    beforeEnter: authGuard
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from) => {
  if (to.meta.permissionId && !hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/settings";
    else showToast(translate('You do not have permission to access this page'));
    return {
      path: redirectToPath,
    }
  }
})

export default router
