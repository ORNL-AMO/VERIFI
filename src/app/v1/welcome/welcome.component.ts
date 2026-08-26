import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { WorkspaceNavigationService } from '../shell/workspace-navigation.service';
import { CreateAccountComponent } from './create-account/create-account.component';
import { EmailListSignupComponent } from './email-list-signup/email-list-signup.component';
import { ExampleAccountComponent } from './example-account/example-account.component';
import { ImportAccountBackupComponent } from './import-account-backup/import-account-backup.component';
import { WELCOME_ACTIONS } from './welcome.models';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  imports: [
    RouterModule,
    CreateAccountComponent,
    ImportAccountBackupComponent,
    ExampleAccountComponent,
    EmailListSignupComponent
  ],
  standalone: true
})
export class WelcomeComponent {
  private readonly lifecycle = inject(ApplicationLifecycleService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly actions = signal(WELCOME_ACTIONS);
  readonly loadingAccountGuid = signal<string | undefined>(undefined);
  readonly errorMessage = signal<string | undefined>(undefined);
  readonly activePanel = signal<'create' | 'import' | 'example' | undefined>(undefined);

  readonly accounts = computed(() => [...this.lifecycle.usableAccounts()].sort((a, b) =>
    new Date(b.modifiedDate || 0).getTime() - new Date(a.modifiedDate || 0).getTime()
  ));
  readonly recentAccount = computed(() => this.accounts()[0]);
  readonly accountCountLabel = computed(() => {
    const count = this.accounts().length;
    return `${count} ${count === 1 ? 'account' : 'accounts'}`;
  });

  async openAccount(account: IdbAccount): Promise<void> {
    if (this.loadingAccountGuid()) { return; }
    this.loadingAccountGuid.set(account.guid);
    this.errorMessage.set(undefined);
    try {
      await this.navigation.openAccount(account.guid);
    } catch {
      this.errorMessage.set(`${account.name} could not be opened in the v1 workspace.`);
    } finally {
      this.loadingAccountGuid.set(undefined);
    }
  }

  openPanel(panel: 'create' | 'import' | 'example'): void {
    if (!this.loadingAccountGuid()) {
      this.errorMessage.set(undefined);
      this.activePanel.set(panel);
    }
  }

  closePanel(): void {
    this.activePanel.set(undefined);
  }

  async openCreatedOrImportedAccount(account: IdbAccount): Promise<void> {
    this.closePanel();
    await this.openAccount(account);
  }

  async openRecentAccount(): Promise<void> {
    const account = this.recentAccount();
    if (account) {
      await this.openAccount(account);
    }
  }

  formatModifiedDate(account: IdbAccount): string {
    if (!account.modifiedDate) {
      return 'Existing account';
    }
    return `Last modified ${new Date(account.modifiedDate).toLocaleString()}`;
  }

  accountTypeLabel(account: IdbAccount): string {
    return account.isSingleFacilityCompany ? 'Single facility' : 'Portfolio';
  }
}
