import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SectionNavModule } from '../section-nav.module';
import { RecentItemsNavComponent } from './recent-items-nav.component';

describe('recent item links', () => {
  it('names both the item and owning facility accessibly and uses its canonical workbench route', () => {
    TestBed.configureTestingModule({ imports: [SectionNavModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(RecentItemsNavComponent);
    fixture.componentRef.setInput('section', 'analysis');
    fixture.componentRef.setInput('items', [{ guid: 'a', facilityGuid: 'f', name: 'Production', facilityName: 'North plant', label: 'Production, North plant', icon: 'analysis', route: ['/facility', 'f', 'analysis', 'a'] }]);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('aria-label')).toBe('Production, North plant'); expect(link.getAttribute('title')).toBe('Production, North plant');
    expect(link.getAttribute('href')).toBe('/facility/f/analysis/a');
    expect(fixture.nativeElement.querySelector('.recent-items__facility').textContent).toBe('North plant');
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-labelledby')).toBe('recent-analysis-title');
    fixture.componentRef.setInput('items', []); fixture.detectChanges(); expect(fixture.nativeElement.querySelector('section')).toBeNull();
    fixture.destroy();
  });
});
