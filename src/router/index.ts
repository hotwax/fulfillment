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
    beforeEnter: authGuard
  },
  {
    path: '/in-progress',
    name: 'InProgress',
    component: InProgress,
    beforeEnter: authGuard
  },
  {
    path: '/completed',
    name: 'Completed',
    component: Completed,
    beforeEnter: authGuard
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: loginGuard
  },
  {
    path: "/exim",
    name: "EXIM",
    component: Exim,
    beforeEnter: authGuard
  },
  {
    path: "/upload-import-orders",
    name: "UploadImportOrders",
    component: UploadImportOrders,
    beforeEnter: authGuard
  },
  {
    path: "/download-packed-orders",
    name: "DownloadPackedOrders",
    component: DownloadPackedOrders,
    beforeEnter: authGuard
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

export default router
