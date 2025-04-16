import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/IndexLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/video/:bvid',
    component: () => import('layouts/IndexLayout.vue'),
    children: [{ path: '', component: () => import('pages/VideoPage.vue'), props: true }],
  },
  {
    path: '/search',
    component: () => import('layouts/ResultsLayout.vue'),
    children: [{ path: '', component: () => import('pages/ResultsPage.vue') }],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('layouts/IndexLayout.vue'),
    children: [{ path: '', component: () => import('pages/NotFoundPage.vue') }],
  },
];

export default routes;
