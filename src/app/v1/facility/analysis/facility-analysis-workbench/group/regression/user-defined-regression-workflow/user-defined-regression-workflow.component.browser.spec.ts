import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisGroup } from '@data/models/analysis';
import { FacilityAnalysisRegressionController } from '../facility-analysis-regression.controller';
import { FacilityAnalysisRegressionFacade } from '../facility-analysis-regression.facade';
import { UserDefinedRegressionWorkflowComponent } from './user-defined-regression-workflow.component';

describe('user-defined model control themes', () => {
  it.each([
    ['light', []],
    ['dark', ['v1-theme-dark']],
    ['dark with high contrast', ['v1-theme-dark', 'v1-contrast-strong']]
  ])('uses theme colors for enabled, disabled, and focused fields in %s mode', async (_name, themeClasses) => {
    const group = signal({
      isGeneratedModel: false, regressionConstant: 2, regressionModelStartMonth: 0, regressionStartYear: 2024,
      regressionModelEndMonth: 11, regressionEndYear: 2024,
      predictorVariables: [
        { id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: -3 },
        { id: 'excluded', name: 'Excluded', productionInAnalysis: false, regressionCoefficient: 0 }
      ]
    } as AnalysisGroup);
    await TestBed.configureTestingModule({
      imports: [UserDefinedRegressionWorkflowComponent],
      providers: [
        FacilityAnalysisRegressionController,
        { provide: FacilityAnalysisRegressionFacade, useValue: {
          group, analysis: signal({ analysisCategory: 'energy' }),
          months: [{ name: 'January', monthNumValue: 0 }, { name: 'December', monthNumValue: 11 }],
          yearOptions: signal([2024]), hasUserDefinedDataIssue: signal(false), generatedModels: signal([]),
          validation: { state: signal({ state: 'idle', source: 'user-defined' }), retry: vi.fn() },
          setPredictorSelected: vi.fn(), changeMaxVariables: vi.fn(), setConstant: vi.fn(), setRange: vi.fn(),
          setNotes: vi.fn(), setCoefficient: vi.fn(), changeMethod: vi.fn(), selectModel: vi.fn()
        } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root', ...themeClasses);
    fixture.detectChanges();

    const themeText = getComputedStyle(host).color;
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--v1-control-surface)';
    host.append(probe);
    const themeControlSurface = getComputedStyle(probe).backgroundColor;
    const fields = host.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input[type="number"], select, textarea'
    );
    expect(fields).toHaveLength(8);
    fields.forEach(field => {
      expect(getComputedStyle(field).color).toBe(themeText);
      expect(getComputedStyle(field).backgroundColor).toBe(themeControlSurface);
    });
    const excluded = host.querySelector<HTMLInputElement>('#coefficient-excluded')!;
    expect(excluded.disabled).toBe(true);
    expect(excluded.value).toBe('0');
    expect(Number(getComputedStyle(excluded).opacity)).toBeGreaterThan(0);

    const endMonth = host.querySelector<HTMLSelectElement>('#model-end-month')!;
    const endYear = host.querySelector<HTMLSelectElement>('#model-end-year')!;
    expect(endMonth.disabled).toBe(true);
    expect(endYear.disabled).toBe(true);
    host.querySelector<HTMLButtonElement>('.v1-user-regression__range-toggle')!.click();
    fixture.detectChanges();
    expect(endMonth.disabled).toBe(false);
    expect(endYear.disabled).toBe(false);
    expect(getComputedStyle(endMonth).color).toBe(themeText);
    expect(getComputedStyle(endYear).backgroundColor).toBe(themeControlSurface);

    const constant = host.querySelector<HTMLInputElement>('#regression-constant')!;
    constant.focus();
    probe.style.backgroundColor = 'var(--v1-surface)';
    expect(getComputedStyle(constant).color).toBe(themeText);
    expect(getComputedStyle(constant).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    expect(getComputedStyle(constant).outlineStyle).toBe('solid');
    expect(constant.value).toBe('2');
    fixture.destroy();
  });
});
