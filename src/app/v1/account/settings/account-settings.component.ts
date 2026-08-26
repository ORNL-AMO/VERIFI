import { Component, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';

@Component({
  selector: 'app-account-settings-page',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css'],
  standalone: false
})
export class AccountSettingsComponent {
  private readonly workspace = inject(AccountWorkspaceStore);

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
}
