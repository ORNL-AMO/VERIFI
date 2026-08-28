import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ExampleAccountComponent } from './example-account.component';

describe('ExampleAccountComponent', () => {
  let fixture: ComponentFixture<ExampleAccountComponent>;
  let get: ReturnType<typeof vi.fn>;
  let prepareTextBackup: ReturnType<typeof vi.fn>;
  let importNewAccount: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    get = vi.fn(() => of('{"origin":"VERIFI"}'));
    prepareTextBackup = vi.fn(() => ({
      origin: 'VERIFI',
      backupFileType: 'Account',
      account: { guid: 'example-account', name: 'Example Account', isSingleFacilityCompany: false }
    }));
    importNewAccount = vi.fn(async backup => ({ ...backup.account, guid: 'loaded-example' } as IdbAccount));
    TestBed.configureTestingModule({
      imports: [ExampleAccountComponent],
      providers: [
        { provide: HttpClient, useValue: { get } },
        { provide: BackupImportCoordinator, useValue: { prepareTextBackup, importNewAccount } }
      ]
    });
    fixture = TestBed.createComponent(ExampleAccountComponent);
    fixture.detectChanges();
  });

  it('loads the selected example and preserves single-facility metadata', async () => {
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);
    const singleFacilityExample = {
      title: 'Single Facility Example',
      choiceLabel: 'Single Facility',
      choiceHint: 'Quick walkthrough',
      assetPath: 'assets/example-data/SingleFacilityExample.json',
      summary: 'Example summary',
      details: [],
      highlights: [],
      cta: 'Load Single Facility Example',
      isSingleFacilityCompany: true
    };

    await fixture.componentInstance.loadExample(singleFacilityExample);

    expect(get).toHaveBeenCalledWith('assets/example-data/SingleFacilityExample.json', { responseType: 'text' });
    expect(importNewAccount.mock.calls[0][0].account.isSingleFacilityCompany).toBe(true);
    expect(completed).toHaveBeenCalledWith(expect.objectContaining({ guid: 'loaded-example' }));
  });
});
