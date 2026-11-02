import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
      { path: 'tasks', loadComponent: () => import('./pages/tasks/tasks.page').then(m => m.TasksPage) },
      { path: 'calendar', loadComponent: () => import('./pages/calendar/calendar.page').then(m => m.CalendarPage) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.page').then(m => m.ReportsPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  // 'new' must come before ':id'
  {
    path: 'task/new',
    loadComponent: () => import('./pages/task-form/task-form.page').then(m => m.TaskFormPage)
  },
  {
    path: 'task/:id',
    loadComponent: () => import('./pages/task-form/task-form.page').then(m => m.TaskFormPage)
  },
  { path: '**', redirectTo: '' }
];
