import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { AccountDataModule } from '../../account-data.module';
import { CustomGridFactorService } from '../custom-grid-factor.service';
import { CustomGridFactorFormComponent } from './custom-grid-factor-form.component';

describe('CustomGridFactorFormComponent', () => {
  let fixture: ComponentFixture<CustomGridFactorFormComponent>;
  let service: {
    newGridFactor: ReturnType<typeof vi.fn>;
    isNameAvailable: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      newGridFactor: vi.fn(() => gridFactor('New custom subregion')),
      isNameAvailable: vi.fn(name => name.toLocaleLowerCase() !== 'duplicate'),
      create: vi.fn(async item => ({ ...item, id: 1 })),
      update: vi.fn(async item => item)
    };
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [{ provide: CustomGridFactorService, useValue: service }]
    });
  });

  it('starts with one required location row and one required residual row', () => {
    fixture = TestBed.createComponent(CustomGridFactorFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.locationRates.length).toBe(1);
    expect(component.residualRates.length).toBe(1);
    expect(component.locationRates.at(0).get('year')?.hasError('required')).toBe(true);
    expect(component.locationRates.at(0).get('CO2')?.hasError('required')).toBe(true);
  });

  it('validates duplicate names and excludes the edited item through the service', () => {
    const item = gridFactor('Existing', 'factor-a');
    fixture = TestBed.createComponent(CustomGridFactorFormComponent);
    fixture.componentRef.setInput('gridFactor', item);
    fixture.detectChanges();
    const name = fixture.componentInstance.form.controls['subregion'];

    name.setValue('Duplicate');

    expect(name.hasError('duplicateGridFactorName')).toBe(true);
    expect(service.isNameAvailable).toHaveBeenLastCalledWith('Duplicate', 'factor-a');
  });

  it('requires unique years in each list and keeps at least one row', () => {
    fixture = TestBed.createComponent(CustomGridFactorFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.locationRates.at(0).patchValue({ year: 2024, CO2: 1, CH4: 1, N2O: 1 });
    component.addRate('location');
    component.locationRates.at(1).patchValue({ year: 2024, CO2: 1, CH4: 1, N2O: 1 });

    expect(component.locationRates.hasError('duplicateYears')).toBe(true);
    component.removeRate('location', 1);
    component.removeRate('location', 0);
    expect(component.locationRates.length).toBe(1);
  });

  it('switches required fields between calculated and direct-rate modes', () => {
    fixture = TestBed.createComponent(CustomGridFactorFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const row = component.locationRates.at(0);

    component.form.controls['directEmissionsRate'].setValue(true);
    component.onMethodChanged();

    expect(row.get('CO2')?.hasError('required')).toBe(false);
    expect(row.get('co2Emissions')?.hasError('required')).toBe(true);
  });

  it('calculates previews and saves rows sorted by year with model fields in the correct positions', async () => {
    fixture = TestBed.createComponent(CustomGridFactorFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.controls['subregion'].setValue('Custom region');
    component.locationRates.at(0).patchValue({ year: 2024, CO2: 50, CH4: 2, N2O: 1 });
    component.recalculateRate('location', 0);
    component.addRate('location');
    component.locationRates.at(1).patchValue({ year: 2022, CO2: 40, CH4: 1, N2O: 2 });
    component.residualRates.at(0).patchValue({ year: 2023, CO2: 30, CH4: 3, N2O: 1 });

    await component.save();

    const saved = service.create.mock.calls[0][0] as IdbCustomEmissionsItem;
    expect(saved.locationEmissionRates.map(rate => rate.year)).toEqual([2022, 2024]);
    expect(saved.locationEmissionRates[1]).toMatchObject({ CO2: 50, CH4: 2, N2O: 1, co2Emissions: 50.321 });
  });

  it('keeps failed saves open with the dirty form and inline feedback', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    service.create.mockRejectedValueOnce(new Error('write failed'));
    fixture = TestBed.createComponent(CustomGridFactorFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.controls['subregion'].setValue('Failed region');
    component.locationRates.at(0).patchValue({ year: 2024, CO2: 1, CH4: 1, N2O: 1 });
    component.residualRates.at(0).patchValue({ year: 2024, CO2: 1, CH4: 1, N2O: 1 });
    component.form.markAsDirty();

    await component.save();

    expect(component.saveError).toContain('could not be saved');
    expect(component.form.dirty).toBe(true);
    expect(component.isSaving).toBe(false);
  });

  function gridFactor(subregion: string, guid = 'new-factor'): IdbCustomEmissionsItem {
    return {
      guid,
      accountId: 'account-a',
      date: new Date(),
      subregion,
      directEmissionsRate: false,
      locationEmissionRates: [{ year: undefined, CO2: undefined, CH4: undefined, N2O: undefined, co2Emissions: undefined }],
      residualEmissionRates: [{ year: undefined, CO2: undefined, CH4: undefined, N2O: undefined, co2Emissions: undefined }]
    } as unknown as IdbCustomEmissionsItem;
  }
});
