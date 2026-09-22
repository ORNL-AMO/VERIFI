import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountDataModule } from '../account-data.module';
import { CustomGwpService } from './custom-gwp.service';
import { CustomGwpsComponent } from './custom-gwps.component';

describe('CustomGwpsComponent', () => {
  const account = signal({ ...getNewIdbAccount(), guid: 'account-a', assessmentReportVersion: 'AR5' as const });
  const customGWPs = signal<IdbCustomGWP[]>([]);
  const canWrite = signal(true);
  const hasPending = signal(false);
  const error = signal(undefined);
  let fixture: ComponentFixture<CustomGwpsComponent>;
  let service: {
    newGwp: ReturnType<typeof vi.fn>;
    isNameAvailable: ReturnType<typeof vi.fn>;
    impactFor: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    customGWPs.set([]);
    canWrite.set(true);
    hasPending.set(false);
    service = {
      newGwp: vi.fn(() => customGwp('New GWP')),
      isNameAvailable: vi.fn(() => true),
      impactFor: vi.fn(() => ({ meterCount: 0, facilityCount: 0, meterNames: [], facilityNames: [] })),
      create: vi.fn(async item => item),
      update: vi.fn(async item => item),
      delete: vi.fn(async () => undefined)
    };
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        { provide: AccountWorkspaceStore, useValue: { account, customGWPs, canWrite, hasPending, error } },
        { provide: CustomGwpService, useValue: service }
      ]
    });
    fixture = TestBed.createComponent(CustomGwpsComponent);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders the shared empty state and opens a large workspace slideout', () => {
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('No custom global warming potentials');
    (element.querySelector('app-data-empty-state button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editorOpen()).toBe(true);
    expect(element.querySelector('.v1-workspace-slideout--large')).toBeTruthy();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
  });

  it('shows the account report value and linked meter impact on cards', () => {
    customGWPs.set([customGwp('Custom refrigerant')]);
    service.impactFor.mockReturnValue({ meterCount: 2, facilityCount: 1, meterNames: ['A', 'B'], facilityNames: ['Plant'] });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';

    expect(text).toContain('Custom refrigerant');
    expect(text).toContain('AR5 value');
    expect(text).toContain('20 kg CO₂e/kg');
    expect(text).toContain('Used by 2 meters');
  });

  it('keeps a dirty editor open when discard is cancelled and disables actions while pending', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openAdd();
    component.setEditorDirty(true);
    component.requestCloseEditor();
    expect(component.editorOpen()).toBe(true);

    component.handleSaved();
    hasPending.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('A workspace change is being saved');
    expect(((fixture.nativeElement as HTMLElement).querySelector('.custom-gwps__header button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not submit deletion while a meter references the GWP', async () => {
    const gwp = customGwp('Used GWP');
    service.impactFor.mockReturnValue({ meterCount: 1, facilityCount: 1, meterNames: ['Chiller'], facilityNames: ['Plant'] });
    fixture.detectChanges();
    fixture.componentInstance.gwpToDelete.set(gwp);

    await fixture.componentInstance.confirmDelete();

    expect(service.delete).not.toHaveBeenCalled();
  });

  function customGwp(label: string): IdbCustomGWP {
    return {
      id: 1,
      guid: 'gwp-a',
      createdDate: new Date(),
      modifiedDate: new Date(),
      accountId: 'account-a',
      date: new Date(),
      label,
      display: label,
      value: 50_000,
      gwp_ar4: 10,
      gwp_ar5: 20,
      gwp_ar6: 30
    };
  }
});
