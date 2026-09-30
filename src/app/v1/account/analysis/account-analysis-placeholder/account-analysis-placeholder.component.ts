import { Component, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-account-analysis-placeholder',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './account-analysis-placeholder.component.html',
  styleUrls: ['./account-analysis-placeholder.component.css']
})
export class AccountAnalysisPlaceholderComponent {
  readonly workspace = inject(AccountWorkspaceStore);
}
