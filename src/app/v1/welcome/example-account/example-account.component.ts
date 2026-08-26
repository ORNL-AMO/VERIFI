import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { firstValueFrom } from 'rxjs';
import { WELCOME_EXAMPLES, WelcomeExample } from '../welcome.models';
import { DrawerFocusTrapDirective } from '../shared/drawer-focus-trap.directive';

@Component({
  selector: 'app-example-account-panel',
  templateUrl: './example-account.component.html',
  styleUrls: ['./example-account.component.css'],
  imports: [DrawerFocusTrapDirective],
  standalone: true
})
export class ExampleAccountComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<IdbAccount>();

  private readonly httpClient = inject(HttpClient);
  private readonly backupImportCoordinator = inject(BackupImportCoordinator);

  readonly examples = WELCOME_EXAMPLES;
  loadingExamplePath: string | undefined;
  loadError = '';

  close(): void {
    if (!this.loadingExamplePath) {
      this.closed.emit();
    }
  }

  async loadExample(example: WelcomeExample): Promise<void> {
    if (this.loadingExamplePath) {
      return;
    }

    this.loadingExamplePath = example.assetPath;
    this.loadError = '';
    try {
      const backupText = await firstValueFrom(this.httpClient.get(example.assetPath, { responseType: 'text' }));
      const backupFile = this.backupImportCoordinator.prepareTextBackup(backupText);
      if (backupFile.backupFileType === 'Account') {
        backupFile.account.isSingleFacilityCompany = example.isSingleFacilityCompany === true;
      }
      const newAccount = await this.backupImportCoordinator.importNewAccount(backupFile);
      this.completed.emit(newAccount);
    } catch (error) {
      console.warn('v1 welcome could not load example account.', error);
      this.loadError = `${example.title} could not be loaded.`;
    } finally {
      this.loadingExamplePath = undefined;
    }
  }
}
