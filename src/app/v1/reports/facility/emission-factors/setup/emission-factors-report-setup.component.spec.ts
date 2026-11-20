import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { EmissionFactorsReportModule } from '../emission-factors-report.module';
import { EmissionFactorsReportService } from '../emission-factors-report.service';
import { EmissionFactorsReportSetupComponent } from './emission-factors-report-setup.component';

describe('Emission Factors setup presentation', () => {
  it('preserves saved unavailable years and updates typed selections while reporting period errors', async () => {
    const settings = new FormGroup({ startYear: new FormControl<number | null>(2020), endYear: new FormControl<number | null>(2024) });
    const draft = signal({ name: 'Factors', settings: settings.getRawValue() });
    const name = new FormControl('Factors', { nonNullable: true });
    const report = { editor: { name, form: { controls: { settings } }, draft, canEdit: () => true },
      years: signal([2022, 2023, 2024]), calendarizationState: signal('ready'), retry: vi.fn() };
    const subscription = settings.valueChanges.subscribe(() => draft.set({ name: name.value, settings: settings.getRawValue() }));
    await TestBed.configureTestingModule({ imports: [EmissionFactorsReportModule], providers: [{ provide: EmissionFactorsReportService, useValue: report }] }).compileComponents();
    const fixture = TestBed.createComponent(EmissionFactorsReportSetupComponent); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement, select = root.querySelector<HTMLSelectElement>('#emission-factors-start')!;
    expect(select.selectedOptions[0].textContent).toContain('2020 (saved)');
    const option = [...select.options].find(item => item.textContent?.trim() === '2024')!;
    select.value = option.value; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(settings.controls.startYear.value).toBe(2024);
    expect(root.querySelector('#emission-factors-period-help')?.textContent).toContain('earlier');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    subscription.unsubscribe();
  });
});
