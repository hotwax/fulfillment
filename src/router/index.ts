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
import SavedMappings from "@/views/SavedMappings.vue"
import { Login, useAuthStore } from '@hotwax/dxp-components';
import { loader } from '@/user-utils';

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
    component: Login
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
