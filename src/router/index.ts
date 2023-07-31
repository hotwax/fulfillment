import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Completed from '@/views/Completed.vue'
import InProgress from '@/views/InProgress.vue'
import OpenOrders from "@/views/OpenOrders.vue"
import Login from '@/views/Login.vue'
import Settings from "@/views/Settings.vue"
import store from '@/store'
import Exim from "@/views/Exim.vue"
import UploadImportOrders from "@/views/UploadImportOrders.vue"
import DownloadPackedOrders from "@/views/DownloadPackedOrders.vue"
import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import 'vue-router'

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}
import SavedMappings from "@/views/SavedMappings.vue"

const authGuard = (to: any, from: any, next: any) => {
  if (store.getters['user/isAuthenticated']) {
    next()
  } else {
    next("/login")
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  if (!store.getters['user/isAuthenticated']) {
    next()
  } else {
    next("/")
  }
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/open-orders'
  },
  {
    path: '/open-orders',
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
    component: Login,
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
