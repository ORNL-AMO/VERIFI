import { TestBed } from '@angular/core/testing';
import { AnalysisResultMarkerLegendComponent, AnalysisResultMarkersComponent } from './analysis-result-markers.component';

describe('analysis result markers', () => {
  it('renders accessible icons and only the supplied legend entries', () => {
    const markerFixture = TestBed.createComponent(AnalysisResultMarkersComponent);
    markerFixture.componentRef.setInput('markers', ['banked-source', 'transition', 'model']);
    markerFixture.detectChanges();
    const labels = [...markerFixture.nativeElement.querySelectorAll('[aria-label]')]
      .map((element: Element) => element.getAttribute('aria-label'));
    expect(labels).toEqual(['Banked source period', 'Transition period', 'Model period']);

    const legendFixture = TestBed.createComponent(AnalysisResultMarkerLegendComponent);
    legendFixture.componentRef.setInput('markers', ['banked-savings']);
    legendFixture.detectChanges();
    expect(legendFixture.nativeElement.textContent).toContain('Banked savings added');
    expect(legendFixture.nativeElement.textContent).not.toContain('Transition period');
  });
});
