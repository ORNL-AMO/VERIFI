import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountDataModule } from '../account-data.module';
import { CustomGridFactorService } from './custom-grid-factor.service';
import { CustomGridFactorsComponent } from './custom-grid-factors.component';

describe('CustomGridFactorsComponent', () => {
  const account = signal({ ...getNewIdbAccount(), guid: 'account-a' });
  const customEmissions = signal<IdbCustomEmissionsItem[]>([]);
  const canWrite = signal(true);
  const hasPending = signal(false);
  const error = signal(undefined);
  let fixture: ComponentFixture<CustomGridFactorsComponent>;
  let service: {
    newGridFactor: ReturnType<typeof vi.fn>;
    isNameAvailable: ReturnType<typeof vi.fn>;
    impactFor: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    customEmissions.set([]);
    canWrite.set(true);
    hasPending.set(false);
    service = {
      newGridFactor: vi.fn(() => gridFactor('New region')),
      isNameAvailable: vi.fn(() => true),
      impactFor: vi.fn(() => ({ accountUses: false, facilityCount: 0, facilityNames: [], isUsed: false })),
      create: vi.fn(async item => item),
      update: vi.fn(async item => item),
      delete: vi.fn(async () => undefined)
    };
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        { provide: AccountWorkspaceStore, useValue: { account, customEmissions, canWrite, hasPending, error } },
        { provide: CustomGridFactorService, useValue: service }
      ]
    });
    fixture = TestBed.createComponent(CustomGridFactorsComponent);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders the shared empty state and opens a large workspace slideout', () => {
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('No custom grid factors');
    (element.querySelector('app-data-empty-state button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editorOpen()).toBe(true);
    expect(element.querySelector('.v1-workspace-slideout--large')).toBeTruthy();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
  });

  it('shows compact latest-rate and usage summaries on cards', () => {
    customEmissions.set([gridFactor('Midwest custom')]);
    service.impactFor.mockReturnValue({ accountUses: true, facilityCount: 2, facilityNames: ['A', 'B'], isUsed: true });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';

    expect(text).toContain('Midwest custom');
    expect(text).toContain('2022–2024');
    expect(text).toContain('50.321 kg CO₂e/MWh (2024)');
    expect(text).toContain('2 facilities');
  });

  it('keeps a dirty editor open when discard is cancelled and blocks close while saving', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAdd();
    component.setEditorDirty(true);
    component.requestCloseEditor();
    expect(component.editorOpen()).toBe(true);

    component.setEditorSaving(true);
    component.requestCloseEditor();
    expect(component.editorOpen()).toBe(true);
    expect(component.isNavigationBlocked()).toBe(true);
  });

  it('does not submit deletion while a grid factor is referenced', async () => {
    const item = gridFactor('Used region');
    service.impactFor.mockReturnValue({ accountUses: true, facilityCount: 0, facilityNames: [], isUsed: true });
    fixture.detectChanges();
    fixture.componentInstance.itemToDelete.set(item);

    await fixture.componentInstance.confirmDelete();

    expect(service.delete).not.toHaveBeenCalled();
  });

  function gridFactor(subregion: string): IdbCustomEmissionsItem {
    return {
      id: 1,
      guid: 'factor-a',
      createdDate: new Date(),
      modifiedDate: new Date(),
      accountId: 'account-a',
      date: new Date(),
      subregion,
      directEmissionsRate: false,
      locationEmissionRates: [
        { year: 2022, CO2: 40, CH4: 1, N2O: 1, co2Emissions: 0 },
        { year: 2024, CO2: 50, CH4: 2, N2O: 1, co2Emissions: 0 }
      ],
      residualEmissionRates: [{ year: 2023, CO2: 30, CH4: 1, N2O: 1, co2Emissions: 0 }]
    };
  }
});
