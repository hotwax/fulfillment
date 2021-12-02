import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Login from '@/views/Login.vue';
import Orders from '@/views/Orders.vue';
import InProgress from '@/views/InProgress.vue';
import Completed from '@/views/Completed.vue';
import Settings from '@/views/Settings.vue';
import store from '@/store';

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
    redirect: '/orders',
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    beforeEnter: loginGuard
  },
  {
    path: '/orders',
    name: 'orders',
    component: Orders,
    beforeEnter: authGuard
  },
  {
    path: '/inprogress',
    name: 'inProgress',
    component: InProgress,
    beforeEnter: authGuard
  },
  {
    path: '/completed',
    name: 'completed',
    component: Completed,
    beforeEnter: authGuard
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    beforeEnter: authGuard
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
