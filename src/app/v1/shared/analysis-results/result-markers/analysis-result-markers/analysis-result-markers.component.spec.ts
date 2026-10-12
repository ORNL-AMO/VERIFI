import { TestBed } from '@angular/core/testing';
import { AnalysisResultMarkersComponent } from './analysis-result-markers.component';

describe('AnalysisResultMarkersComponent', () => {
  it('renders accessible marker labels and icons', () => {
    TestBed.configureTestingModule({ imports: [AnalysisResultMarkersComponent] });
    const fixture = TestBed.createComponent(AnalysisResultMarkersComponent);
    fixture.componentRef.setInput('markers', ['banked-source', 'transition']);
    fixture.detectChanges();

    const markers = fixture.nativeElement.querySelectorAll('.v1-result-marker') as NodeListOf<HTMLElement>;
    expect(Array.from(markers).map(marker => marker.getAttribute('aria-label')))
      .toEqual(['Banked source period', 'Transition period']);
    expect(Array.from(markers).map(marker => marker.getAttribute('role'))).toEqual(['img', 'img']);
  });
});
