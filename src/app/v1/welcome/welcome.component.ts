import { Component, computed, inject, signal } from '@angular/core';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { WorkspaceNavigationService } from '../shell/workspace-navigation.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  standalone: false
})
export class WelcomeComponent {
  private readonly lifecycle = inject(ApplicationLifecycleService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly loadingAccountGuid = signal<string | undefined>(undefined);
  readonly errorMessage = signal<string | undefined>(undefined);

  readonly accounts = computed(() => [...this.lifecycle.usableAccounts()].sort((a, b) =>
    new Date(b.modifiedDate || 0).getTime() - new Date(a.modifiedDate || 0).getTime()
  ));

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

  formatModifiedDate(account: IdbAccount): string {
    if (!account.modifiedDate) {
      return 'Existing account';
    }
    return `Last modified ${new Date(account.modifiedDate).toLocaleString()}`;
  }
}
