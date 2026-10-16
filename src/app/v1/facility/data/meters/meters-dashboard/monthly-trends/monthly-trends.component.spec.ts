import { TestBed } from '@angular/core/testing';
import { MonthlyTrendsComponent } from './monthly-trends.component';
import { buildMonthlyTrends } from '../meters-dashboard.view';

describe('MonthlyTrendsComponent', () => {
  it('provides one shared zoom control and honest chart empty states', () => {
    TestBed.configureTestingModule({ imports: [MonthlyTrendsComponent] });
    const fixture = TestBed.createComponent(MonthlyTrendsComponent);
    fixture.componentRef.setInput('charts', buildMonthlyTrends([], undefined, true));
    fixture.componentRef.setInput('state', 'ready'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Chart zoom"]')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[aria-label="Energy by meter"] [aria-label="Chart zoom"]')).not.toBeNull();
    expect([...fixture.nativeElement.querySelectorAll('.monthly-trends__panel > header h2')].map((heading: any) => heading.textContent.trim())).toEqual(['Energy', 'Water', 'Cost USD']);
    expect(fixture.nativeElement.textContent).toContain('No monthly water data');
    const changed = vi.fn(); fixture.componentInstance.zoomChanged.subscribe(changed);
    fixture.componentInstance.zoom(.6); expect(changed).toHaveBeenCalledWith({ start: 20, end: 80 });
    expect(fixture.nativeElement.querySelectorAll('.v1-meter-results-chart__controls')).toHaveLength(0);
  });
});
