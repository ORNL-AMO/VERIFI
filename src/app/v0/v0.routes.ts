import { Routes } from '@angular/router';
import { ManageAccountsComponent } from '../core-components/manage-accounts/manage-accounts.component';
import { HomePageComponent } from '../core-components/home-page/home-page.component';
import { DataManagementRoutes } from '../routing/data-management.routes';
import { DataEvaluationRoutes } from '../routing/data-evaluation.routes';
import { FeedbackComponent } from '../static-content/feedback/feedback.component';
import { PrivacyNoticeComponent } from '../static-content/privacy-notice/privacy-notice.component';
import { persistenceReadyGuard } from '../routing/workspace-readiness.guards';
import { PageNotFoundComponent } from '../core-components/page-not-found/page-not-found.component';
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
