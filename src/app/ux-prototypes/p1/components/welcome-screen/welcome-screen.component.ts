import { Component, inject } from '@angular/core';
import { BackupImportCoordinator } from 'src/app/backup/backup-import-coordinator.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { P1AccountSummary, P1WelcomeAction } from '../../p1.models';
import { P1RouteFacade } from '../../p1-route.facade';

interface WelcomeExample {
  title: string;
  assetPath: string;
  summary: string;
  details: Array<string>;
  highlights: Array<string>;
  cta: string;
}

@Component({
  selector: 'app-p1-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.css'],
  standalone: false
})
export class P1WelcomeScreenComponent {
  readonly facade = inject(P1RouteFacade);
  private readonly backupImportCoordinator = inject(BackupImportCoordinator);
  private readonly loadingService = inject(LoadingService);
  private readonly toastNotificationService = inject(ToastNotificationsService);

  readonly examples: Array<WelcomeExample> = [
    {
      title: 'Cocoa Co. Portfolio',
      assetPath: 'assets/example-data/ExampleAccount.json',
      summary: 'A multi-facility account for exploring portfolio navigation, rollups, account and facility analyses, reports, and the broader workspace concept.',
      details: [
        'Use this example when you want to see how VERIFI organizes several manufacturing facilities under one corporate account.',
        'It includes utility data, analysis-ready structures, and reporting context that demonstrate account-level and facility-level workflows together.'
      ],
      highlights: ['3 facilities', '9 meters', '4 analysis items', 'Account reports'],
      cta: 'Load Portfolio Example'
    },
    {
      title: 'Cocoa Co. Single Facility',
      assetPath: 'assets/example-data/SingleFacilityExample.json',
      summary: 'A smaller account for walking through one facility setup, meters, utility data, analysis, and focused prototype workflows.',
      details: [
        'Use this example when you want a simpler workspace with less portfolio noise and a faster path through facility-level data entry and analysis.',
        'It is useful for demonstrating the tool to new users who need to understand the basic workflow before scaling up.'
      ],
      highlights: ['1 facility', '5 meters', '2 analysis items', 'Focused walkthrough'],
      cta: 'Load Single Facility Example'
    }
  ];

  isExampleDrawerOpen = false;
  isCreateAccountDrawerOpen = false;
  isImportAccountBackupDrawerOpen = false;
  loadingExamplePath: string | undefined;

  get recentAccount(): P1AccountSummary | undefined {
    const accounts = this.facade.accounts();
    return accounts.find(account => account.isActive) || accounts[0];
  }

  openRecentAccount(): void {
    const account = this.recentAccount;
    if (account) {
      void this.facade.openWorkspace(account.id);
    }
  }

  isLoadExampleAction(action: P1WelcomeAction): boolean {
    return action.title === 'Load Example Account';
  }

  isCreateAccountAction(action: P1WelcomeAction): boolean {
    return action.title === 'Create New Account';
  }

  isImportAccountBackupAction(action: P1WelcomeAction): boolean {
    return action.title === 'Upload Account Backup';
  }

  openCreateAccountDrawer(): void {
    this.isCreateAccountDrawerOpen = true;
  }

  closeCreateAccountDrawer(): void {
    this.isCreateAccountDrawerOpen = false;
  }

  openImportAccountBackupDrawer(): void {
    this.isImportAccountBackupDrawerOpen = true;
  }

  closeImportAccountBackupDrawer(): void {
    this.isImportAccountBackupDrawerOpen = false;
  }

  openExampleDrawer(): void {
    this.isExampleDrawerOpen = true;
  }

  closeExampleDrawer(): void {
    if (!this.loadingExamplePath) {
      this.isExampleDrawerOpen = false;
    }
  }

  async loadExample(example: WelcomeExample): Promise<void> {
    if (this.loadingExamplePath) {
      return;
    }

    this.loadingExamplePath = example.assetPath;
    this.loadingService.setContext('load-example-data');
    this.loadingService.setTitle('Loading Example Data');
    this.isExampleDrawerOpen = false;

    try {
      const backupText = await this.readExampleBackup(example.assetPath);
      const backupFile = this.backupImportCoordinator.prepareTextBackup(backupText);
      const newAccount: IdbAccount = await this.backupImportCoordinator.importNewAccount(backupFile);
      this.loadingService.isLoadingComplete.next(true);
      await this.facade.openWorkspace(newAccount.guid);
    } catch (error) {
      console.warn('P1 prototype could not load example account.', error);
      this.loadingService.clearLoadingMessages();
      this.loadingService.setContext(undefined);
      this.loadingService.setTitle('');
      this.loadingService.isLoadingComplete.next(true);
      this.toastNotificationService.showToast('Error loading example', `${example.title} could not be loaded.`, 15000, false, 'alert-danger');
    } finally {
      this.loadingExamplePath = undefined;
    }
  }

  private readExampleBackup(assetPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', assetPath, true);
      request.responseType = 'blob';
      request.onload = () => {
        if (request.status >= 400) {
          reject(new Error(`Unable to load ${assetPath}.`));
          return;
        }

        const reader = new FileReader();
        reader.readAsText(request.response);
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error || new Error(`Unable to read ${assetPath}.`));
      };
      request.onerror = () => reject(new Error(`Unable to load ${assetPath}.`));
      request.send();
    });
  }
}
