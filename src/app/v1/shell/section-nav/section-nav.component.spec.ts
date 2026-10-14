import { TestBed } from '@angular/core/testing';
import { SectionNavComponent } from './section-nav.component';
import { setupSectionNavTest, meterNav } from './section-nav-test.helpers';

describe('SectionNavComponent', () => {
  let state: ReturnType<typeof setupSectionNavTest>;
  beforeEach(() => { state = setupSectionNavTest(); });

  it('shows home navigation only when the Home rail section is active', () => {
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Home');
    expect(fixture.nativeElement.textContent).toContain('Overview');
    expect(fixture.nativeElement.textContent).not.toContain('Account Settings');
  });

  it('hides context switching for a valid single-facility workspace', () => {
    const { activeSection, contextMode, selectedFacility, isSingleSiteWorkspace } = state;
    isSingleSiteWorkspace.set(true);
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('home');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-nav__context')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Facility Home');

    activeSection.set('settings');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Settings');
  });

  it('mounts only the selected section and preserves each disclosure across section changes', () => {
    const { activeSection, activeDetail, contextMode, selectedFacility, facilityMeters, facilityMeterGroups, facilityPredictors } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    facilityMeters.set([meterNav('meter-a', 'Meter A')]);
    facilityMeterGroups.set([{ guid: 'group-a', name: 'Group A' }]);
    facilityPredictors.set([{ guid: 'predictor-a', name: 'Predictor A' }]);
    activeSection.set('data');
    const fixture = TestBed.createComponent(SectionNavComponent);
    for (const detail of ['meters', 'meter-grouping', 'predictors']) {
      activeDetail.set(detail);
      fixture.detectChanges();
      const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.v1-nav__child-toggle');
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    }
    activeSection.set('settings');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-data-nav')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-settings-nav')).not.toBeNull();
    activeSection.set('data');
    for (const detail of ['meters', 'meter-grouping', 'predictors']) {
      activeDetail.set(detail);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.v1-nav__child-toggle').getAttribute('aria-expanded')).toBe('false');
    }
    selectedFacility.set({ guid: 'facility-b', name: 'Facility B' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-nav__child-toggle').getAttribute('aria-expanded')).toBe('true');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-nav__child-toggle').getAttribute('aria-expanded')).toBe('false');
  });
});
