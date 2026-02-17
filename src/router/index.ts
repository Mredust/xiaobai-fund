import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

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
        component: () => import('@/views/home/HoldingsView.vue')
      },
      {
        path: 'watchlist',
        name: 'watchlist',
        component: () => import('@/views/hold/WatchlistView.vue')
      },
      {
        path: 'market',
        name: 'market',
        component: () => import('@/views/market/MarketView.vue')
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/profile/ProfileView.vue')
      }
    ]
  },
  {
    path: '/tag-manage',
    name: 'tag-manage',
    component: () => import('@/views/home/TagManageView.vue')
  },
  {
    path: '/import-holdings',
    name: 'import-holdings',
    component: () => import('@/views/home/ImportHoldingsView.vue')
  },
  {
    path: '/manual-holdings',
    name: 'manual-holdings',
    component: () => import('@/views/home/ManualHoldingsView.vue')
  },
  {
    path: '/fund-search',
    name: 'fund-search',
    component: () => import('@/views/common/FundSearchView.vue')
  },
  {
    path: '/fund/:code',
    name: 'fund-detail',
    component: () => import('@/views/hold/FundDetailView.vue')
  },
  {
    path: '/fund/:code/edit-holding',
    name: 'fund-edit-holding',
    component: () => import('@/views/hold/EditHoldingView.vue')
  },
  {
    path: '/fund/:code/sync-buy',
    name: 'fund-sync-buy',
    component: () => import('@/views/hold/SyncTradeView.vue')
  },
  {
    path: '/fund/:code/sync-sell',
    name: 'fund-sync-sell',
    component: () => import('@/views/hold/SyncTradeView.vue')
  },
  {
    path: '/fund/:code/sip',
    name: 'fund-sip',
    component: () => import('@/views/hold/SipView.vue')
  },
  {
    path: '/fund/:code/sip-plan',
    name: 'fund-sip-plan',
    component: () => import('@/views/hold/SipPlanView.vue')
  },
  {
    path: '/fund/:code/convert',
    name: 'fund-convert',
    component: () => import('@/views/hold/ConvertView.vue')
  },
  {
    path: '/fund/:code/trade-record',
    name: 'fund-trade-record',
    component: () => import('@/views/hold/TradeRecordView.vue')
  },
  {
    path: '/sector/:name',
    name: 'sector-detail',
    component: () => import('@/views/hold/SectorDetailView.vue')
  },
  {
    path: '/profile-info',
    name: 'profile-info',
    component: () => import('@/views/profile/ProfileInfoView.vue')
  },
  {
    path: '/feedback',
    name: 'feedback',
    component: () => import('@/views/profile/FeedbackView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
