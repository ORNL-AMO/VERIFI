import { TestBed } from '@angular/core/testing';
import { AnalysisResultMarkerLegendComponent } from './analysis-result-marker-legend.component';

describe('AnalysisResultMarkerLegendComponent', () => {
  it('deduplicates markers in their shared display order', () => {
    TestBed.configureTestingModule({ imports: [AnalysisResultMarkerLegendComponent] });
    const fixture = TestBed.createComponent(AnalysisResultMarkerLegendComponent);
    fixture.componentRef.setInput('markers', ['model', 'transition', 'model', 'banked-source']);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.v1-result-marker-legend__item') as NodeListOf<HTMLElement>;
    expect(Array.from(items).map(item => item.textContent.trim()))
      .toEqual(['Banked source period', 'Transition period', 'Model period']);
  });
});
