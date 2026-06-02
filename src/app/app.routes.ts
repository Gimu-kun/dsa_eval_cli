import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./components/auth/auth').then(m => m.AuthComponent)
    },
    {
        path: 'admin/questions',
        loadComponent: () => import('./components/admin-questions/admin-questions').then(m => m.AdminQuestionsComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'assignment/:id',
        loadComponent: () => import('./components/solve-assignment/solve-assignment').then(m => m.SolveAssignmentComponent),
        canActivate: [authGuard]
    },
    {
        path: 'evaluation/:submissionId',
        loadComponent: () => import('./components/evaluation-report/evaluation-report').then(m => m.EvaluationReportComponent),
        canActivate: [authGuard]
    },
    {
        path: '',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent),
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
