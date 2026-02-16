import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        redirect: '/holdings'
      },
      {
        path: 'holdings',
        name: 'holdings',
        component: () => import('../views/HoldingsView.vue')
      },
      {
        path: 'watchlist',
        name: 'watchlist',
        component: () => import('../views/WatchlistView.vue')
      },
      {
        path: 'market',
        name: 'market',
        component: () => import('../views/MarketView.vue')
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/ProfileView.vue')
      }
    ]
  },
  {
    path: '/tag-manage',
    name: 'tag-manage',
    component: () => import('../views/TagManageView.vue')
  },
  {
    path: '/import-holdings',
    name: 'import-holdings',
    component: () => import('../views/ImportHoldingsView.vue')
  },
  {
    path: '/manual-holdings',
    name: 'manual-holdings',
    component: () => import('../views/ManualHoldingsView.vue')
  },
  {
    path: '/fund-search',
    name: 'fund-search',
    component: () => import('../views/FundSearchView.vue')
  },
  {
    path: '/fund/:code',
    name: 'fund-detail',
    component: () => import('../views/FundDetailView.vue')
  },
  {
    path: '/fund/:code/edit-holding',
    name: 'fund-edit-holding',
    component: () => import('../views/EditHoldingView.vue')
  },
  {
    path: '/fund/:code/sync-buy',
    name: 'fund-sync-buy',
    component: () => import('../views/SyncTradeView.vue')
  },
  {
    path: '/fund/:code/sync-sell',
    name: 'fund-sync-sell',
    component: () => import('../views/SyncTradeView.vue')
  },
  {
    path: '/fund/:code/sip',
    name: 'fund-sip',
    component: () => import('../views/SipView.vue')
  },
  {
    path: '/fund/:code/sip-plan',
    name: 'fund-sip-plan',
    component: () => import('../views/SipPlanView.vue')
  },
  {
    path: '/fund/:code/convert',
    name: 'fund-convert',
    component: () => import('../views/ConvertView.vue')
  },
  {
    path: '/fund/:code/trade-record',
    name: 'fund-trade-record',
    component: () => import('../views/TradeRecordView.vue')
  },
  {
    path: '/sector/:name',
    name: 'sector-detail',
    component: () => import('../views/SectorDetailView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
