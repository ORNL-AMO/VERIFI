import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { GlobalWarmingPotentials } from '@data/models/globalWarmingPotentials';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { AccountDataModule } from '../../account-data.module';
import { CustomGwpService } from '../custom-gwp.service';
import { CustomGwpFormComponent } from './custom-gwp-form.component';

describe('CustomGwpFormComponent', () => {
  const account = signal({ ...getNewIdbAccount(), guid: 'account-a', assessmentReportVersion: 'AR5' as const });
  let fixture: ComponentFixture<CustomGwpFormComponent>;
  let service: {
    newGwp: ReturnType<typeof vi.fn>;
    isNameAvailable: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      newGwp: vi.fn(() => customGwp('New custom GWP', 50_000, 0, 0, 0)),
      isNameAvailable: vi.fn(name => name.toLocaleLowerCase() !== 'duplicate'),
      create: vi.fn(async gwp => ({ ...gwp, id: 1 })),
      update: vi.fn(async gwp => gwp)
    };
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        { provide: AccountWorkspaceStore, useValue: { account } },
        { provide: CustomGwpService, useValue: service }
      ]
    });
  });

  it('requires a unique name and excludes the edited record', () => {
    const item = customGwp('Existing', 50_000, 10, 20, 30);
    fixture = TestBed.createComponent(CustomGwpFormComponent);
    fixture.componentRef.setInput('gwp', item);
    fixture.detectChanges();
    const name = fixture.componentInstance.form.controls['label'];

    name.setValue('Duplicate');

    expect(name.hasError('duplicateGwpName')).toBe(true);
    expect(service.isNameAvailable).toHaveBeenLastCalledWith('Duplicate', item.guid);
  });

  it('initializes imported differing values from the selected account report and explains normalization', () => {
    const item = customGwp('Imported', 50_000, 10, 20, 30);
    fixture = TestBed.createComponent(CustomGwpFormComponent);
    fixture.componentRef.setInput('gwp', item);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls['value'].value).toBe(20);
    expect(fixture.componentInstance.normalizesAssessmentValues).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('saving applies it to AR4, AR5, and AR6');
  });

  it('clones the selected report value from a standard GWP without replacing the stable identifier', () => {
    fixture = TestBed.createComponent(CustomGwpFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const source = GlobalWarmingPotentials[0];

    component.selectStandardGwp(source);

    expect(component.draft.value).toBe(50_000);
    expect(component.form.controls['label'].value).toBe(`${source.label} (Modified)`);
    expect(component.form.controls['value'].value).toBe(source.gwp_ar5);
    expect(component.form.dirty).toBe(true);
  });

  it('stores one nonnegative value identically for AR4, AR5, and AR6', async () => {
    fixture = TestBed.createComponent(CustomGwpFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.setValue({ label: 'Custom refrigerant', value: 123.5 });

    await component.save();

    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Custom refrigerant',
      display: 'Custom refrigerant',
      value: 50_000,
      gwp_ar4: 123.5,
      gwp_ar5: 123.5,
      gwp_ar6: 123.5
    }));
  });

  it('keeps failed saves open with inline feedback', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    service.create.mockRejectedValueOnce(new Error('write failed'));
    fixture = TestBed.createComponent(CustomGwpFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.setValue({ label: 'Failed GWP', value: 10 });
    component.form.markAsDirty();

    await component.save();

    expect(component.saveError).toContain('could not be saved');
    expect(component.form.dirty).toBe(true);
    expect(component.isSaving).toBe(false);
  });

  function customGwp(label: string, value: number, ar4: number, ar5: number, ar6: number): IdbCustomGWP {
    return {
      id: 1,
      guid: 'gwp-a',
      createdDate: new Date(),
      modifiedDate: new Date(),
      accountId: 'account-a',
      date: new Date(),
      label,
      display: label,
      value,
      gwp_ar4: ar4,
      gwp_ar5: ar5,
      gwp_ar6: ar6
    };
  }
});
