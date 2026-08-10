import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { BackupImportCoordinator } from 'src/app/backup/backup-import-coordinator.service';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { LoadingService } from '../loading/loading.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { HomePageComponent } from './home-page.component';
import { Meta, Title } from '@angular/platform-browser';
import { getNewIdbAccount, IdbAccount } from 'src/app/models/idbModels/account';

@NgModule({
  declarations: [HomePageComponent],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA]
})
class HomePageComponentTestModule { }

describe('HomePageComponent', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let loadingService: LoadingService;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let accountCatalog: WritableSignal<IdbAccount[]>;
  let backupImportCoordinator: {
    prepareTextBackup: ReturnType<typeof vi.fn>;
    importNewAccount: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    accountCatalog = signal([]);
    router = {
      navigateByUrl: vi.fn()
    };
    backupImportCoordinator = {
      prepareTextBackup: vi.fn().mockReturnValue({}),
      importNewAccount: vi.fn().mockImplementation(async () => {
        const importedAccount = {
          ...getNewIdbAccount(),
          guid: 'example-account',
          name: 'Example Account',
          modifiedDate: new Date('2026-08-10T12:00:00')
        };
        accountCatalog.set([importedAccount]);
        return importedAccount;
      })
    };

    TestBed.configureTestingModule({
      imports: [HomePageComponentTestModule],
      providers: [
        {
          provide: ApplicationLifecycleService,
          useValue: {
            accountCatalog
          }
        },
        { provide: AccountWorkspaceService, useValue: { selectAccount: vi.fn() } },
        { provide: BackupImportCoordinator, useValue: backupImportCoordinator },
        { provide: ImportBackupModalService, useValue: { showModal: new BehaviorSubject(false) } },
        { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
        { provide: Router, useValue: router },
        { provide: Title, useValue: { setTitle: vi.fn() } },
        { provide: Meta, useValue: { updateTag: vi.fn() } },
        LoadingService
      ]
    });

    loadingService = TestBed.inject(LoadingService);
    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('navigates to account home after example data loading completes', () => {
    loadingService.navigationAfterLoading.next('load-example-data');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/data-evaluation/account/home');
    expect(loadingService.navigationAfterLoading.getValue()).toBeUndefined();
  });

  it('updates the account portfolio after example data is imported', async () => {
    stubExampleAccountFileLoad();

    fixture.componentInstance.loadTestData();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(backupImportCoordinator.importNewAccount).toHaveBeenCalled();
    expect(fixture.componentInstance.accounts).toEqual([
      expect.objectContaining({
        guid: 'example-account',
        name: 'Example Account'
      })
    ]);
  });
});

function stubExampleAccountFileLoad(): void {
  class FakeXMLHttpRequest {
    response = new Blob(['{}'], { type: 'application/json' });
    onload: () => void = () => undefined;

    open() { }

    send() {
      this.onload();
    }
  }

  class FakeFileReader {
    result = '{}';
    onloadend: () => void = () => undefined;

    readAsText() {
      setTimeout(() => this.onloadend(), 0);
    }
  }

  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
  vi.stubGlobal('FileReader', FakeFileReader);
}
