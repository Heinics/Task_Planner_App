import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage) },
      { path: 'families', loadComponent: () => import('./pages/families/families.page').then(m => m.FamiliesPage) },
      { path: 'residents', loadComponent: () => import('./pages/residents/residents.page').then(m => m.ResidentsPage) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage) },
      { path: 'sync', loadComponent: () => import('./pages/sync/sync.page').then(m => m.SyncPage) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'family/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/family-detail/family-detail.page').then(m => m.FamilyDetailPage)
  },
  {
    path: 'resident/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/resident-detail/resident-detail.page').then(m => m.ResidentDetailPage)
  },
  { path: '**', redirectTo: '' }
];
