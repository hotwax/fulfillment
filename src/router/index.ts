import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Settings from "@/views/Settings.vue"
import store from '@/store'
import Orders from "@/views/Orders.vue"
import Completed from "@/views/Completed.vue"
import InProgress from "@/views/InProgress.vue"

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
    redirect: '/orders'
  },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    beforeEnter: authGuard
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
    path: "/orders",
    name: "Orders",
    component: Orders,
    beforeEnter: authGuard
  },
  {
    path: "/inprogress",
    name: "InProgress",
    component: InProgress,
    beforeEnter: authGuard
  },
  {
    path: "/completed",
    name: "Completed",
    component: Completed,
    beforeEnter: authGuard
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router