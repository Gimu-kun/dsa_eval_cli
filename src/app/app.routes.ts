import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'test/dashboard',
        pathMatch: 'full'
      },
    {
        path: 'login',
        loadComponent: () => import('./components/auth/auth').then(m => m.AuthComponent)
    },

    /*
    // ── Admin: Câu hỏi & Đánh giá ───────────────────────────────────────────
    {
        path: 'admin/questions',
        loadComponent: () => import('./components/admin/question-bank-page/question-bank-page').then(m => m.QuestionBankPageComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'admin/evaluation',
        loadComponent: () => import('./components/admin/evaluation-grading-page/evaluation-grading-page').then(m => m.EvaluationGradingPageComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'admin/matrix',
        loadComponent: () => import('./components/admin/exam-matrix-page/exam-matrix-page').then(m => m.ExamMatrixPageComponent),
        canActivate: [authGuard, adminGuard]
    },

    // ── Admin: Quản lý tri thức ──────────────────────────────────────────────
    {
        path: 'admin/topics',
        loadComponent: () => import('./components/admin/topic-management/topic-management').then(m => m.TopicManagementComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'admin/rubrics',
        loadComponent: () => import('./components/admin/rubric-management/rubric-management').then(m => m.RubricManagementComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'admin/concepts',
        loadComponent: () => import('./components/admin/concept-management/concept-management').then(m => m.ConceptManagementComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'admin/relations',
        loadComponent: () => import('./components/admin/relation-management/relation-management').then(m => m.RelationManagementComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'admin/rules',
        loadComponent: () => import('./components/admin/rule-management/rule-management').then(m => m.RuleManagementComponent),
        canActivate: [authGuard, adminGuard]
    },
    {
        path: 'admin/funcs',
        loadComponent: () => import('./components/admin/func-management/func-management').then(m => m.FuncManagementComponent),
        canActivate: [authGuard, adminGuard]
    },
    */
    {
        path: 'evaluation/:submissionId',
        loadComponent: () => import('./components/evaluation-report/evaluation-report').then(m => m.EvaluationReportComponent),
        canActivate: [authGuard]
    },
    {
        path: 'test/evaluation',
        loadComponent: () => import('./components/test-evaluation/test-evaluation').then(m => m.TestEvaluationComponent)
    },
    {
        path: 'test/dashboard',
        loadComponent: () => import('./components/test-dashboard/test-dashboard').then(m => m.TestDashboardComponent)
    },
    {
        path: '**',
        redirectTo: ''
    }
];
