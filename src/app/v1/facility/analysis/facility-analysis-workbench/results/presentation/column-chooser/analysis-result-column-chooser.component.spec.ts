import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { AnalysisResultColumnChooserComponent } from './analysis-result-column-chooser.component';
import { FacilityAnalysisResultsDisplayService } from '../facility-analysis-results-display.service';

describe('AnalysisResultColumnChooserComponent', () => {
  let fixture: ComponentFixture<AnalysisResultColumnChooserComponent>;
  let display: FacilityAnalysisResultsDisplayService;
  let storage: { retrieve: ReturnType<typeof vi.fn>; store: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    storage = { retrieve: vi.fn(), store: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AnalysisResultColumnChooserComponent],
      providers: [
        FacilityAnalysisResultsDisplayService,
        { provide: LocalStorageService, useValue: storage }
      ]
    }).compileComponents();
    display = TestBed.inject(FacilityAnalysisResultsDisplayService);
    fixture = TestBed.createComponent(AnalysisResultColumnChooserComponent);
    fixture.componentRef.setInput('period', 'annual');
    fixture.componentRef.setInput('predictorScopeId', 'group-a');
    fixture.componentRef.setInput('predictorVariables', [{
      id: 'predictor-a', name: 'Production', unit: 'units', production: true,
      productionInAnalysis: true, regressionCoefficient: 1
    }]);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('synchronizes controls when opened and discards unapplied changes on cancel', () => {
    clickButton('Choose Columns');
    const storesAfterOpen = storage.store.mock.calls.length;

    expect(fixture.componentInstance.control('actualEnergy').value).toBe(true);
    expect(fixture.componentInstance.predictorControl('predictor-a').value).toBe(true);

    clickButton('Hide All');
    expect(fixture.componentInstance.control('actualEnergy').value).toBe(false);
    clickButton('Cancel');

    expect(display.annualColumns().actualEnergy).toBe(true);
    expect(display.annualColumns().predictors[0].display).toBe(true);
    expect(storage.store).toHaveBeenCalledTimes(storesAfterOpen);
  });

  it('applies show, hide, and default actions with scoped predictor visibility', () => {
    clickButton('Choose Columns');
    clickButton('Hide All');
    clickButton('Apply');

    expect(display.annualColumns()).toMatchObject({
      actualEnergy: false,
      adjusted: false,
      predictorGroupId: 'group-a',
      predictors: [{ display: false, usedInAnalysis: true }]
    });

    clickButton('Choose Columns');
    clickButton('Show All');
    clickButton('Apply');
    expect(display.annualColumns().actualEnergy).toBe(true);
    expect(display.annualColumns().predictors[0].display).toBe(true);

    display.setColumns('annual', { actualEnergy: false });
    display.setPredictorVisibility('annual', 'group-a', { 'predictor-a': false });
    clickButton('Choose Columns');
    clickButton('Use Defaults');
    clickButton('Apply');

    expect(display.annualColumns().actualEnergy).toBe(true);
    expect(display.annualColumns().predictors[0].display).toBe(true);
  });

  function clickButton(label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(item => item.textContent?.trim() === label);
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }
});
