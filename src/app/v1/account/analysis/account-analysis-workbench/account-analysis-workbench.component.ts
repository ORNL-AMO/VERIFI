import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from './account-analysis-workbench-context.service';
import { AccountAnalysisWorkbenchNavigationService } from './navigation/account-analysis-workbench-navigation.service';
import { AccountAnalysisWorkbenchHeaderComponent } from './header/account-analysis-workbench-header.component';
import { AccountAnalysisWorkbenchStageNavigationComponent } from './stage-navigation/account-analysis-workbench-stage-navigation.component';
import { AccountAnalysisWorkbenchFooterComponent } from './footer/account-analysis-workbench-footer.component';

@Component({
  selector: 'app-account-analysis-workbench',
  standalone: true,
  providers: [AccountAnalysisWorkbenchContext, AccountAnalysisWorkbenchNavigationService],
  imports: [
    RouterOutlet,
    RouterLink,
    IconComponent,
    AccountAnalysisWorkbenchHeaderComponent,
    AccountAnalysisWorkbenchStageNavigationComponent,
    AccountAnalysisWorkbenchFooterComponent
  ],
  templateUrl: './account-analysis-workbench.component.html',
  styleUrls: ['./account-analysis-workbench.component.css']
})
export class AccountAnalysisWorkbenchComponent {
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
}
