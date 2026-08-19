import { Routes } from '@angular/router';
import { ManageAccountsComponent } from '@v0/core-components/manage-accounts/manage-accounts.component';
import { HomePageComponent } from '@v0/core-components/home-page/home-page.component';
import { DataManagementRoutes } from '@v0/routing/data-management.routes';
import { DataEvaluationRoutes } from '@v0/routing/data-evaluation.routes';
import { FeedbackComponent } from '@v0/static-content/feedback/feedback.component';
import { PrivacyNoticeComponent } from '@v0/static-content/privacy-notice/privacy-notice.component';
import { persistenceReadyGuard } from '../routing/workspace-readiness.guards';
import { PageNotFoundComponent } from '@v0/core-components/page-not-found/page-not-found.component';
import { ExistingUxShellComponent } from './shell/existing-ux-shell/existing-ux-shell.component';

const LegacyRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'welcome' },
  { path: 'welcome', component: HomePageComponent, canActivate: [persistenceReadyGuard] },
  DataEvaluationRoutes,
  DataManagementRoutes,
  { path: 'manage-accounts', component: ManageAccountsComponent, canActivate: [persistenceReadyGuard] },
  { path: 'feedback', component: FeedbackComponent },
  { path: 'privacy', component: PrivacyNoticeComponent },
  { path: '**', component: PageNotFoundComponent },
];

export const V0Routes: Routes = [
  {
    path: '',
    component: ExistingUxShellComponent,
    children: LegacyRoutes
  }
];
