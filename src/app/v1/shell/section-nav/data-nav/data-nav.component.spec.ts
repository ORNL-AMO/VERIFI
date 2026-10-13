import { TestBed } from '@angular/core/testing';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { DataNavComponent } from './data-nav.component';
import { setupSectionNavTest, activeLinks, meterChildLinks, groupChildLinks, predictorChildLinks, meterNav } from '../section-nav-test.helpers';

describe('DataNavComponent', () => {
  let state: ReturnType<typeof setupSectionNavTest>;
  beforeEach(() => { state = setupSectionNavTest(); });

  it('shows account portfolio and fuels custom data navigation when the Data rail section is active', () => {
    const { activeSection, account, activeDetail } = state;
    activeSection.set('data');
    activeDetail.set('portfolio');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Data');
    expect(fixture.nativeElement.textContent).toContain('Portfolio');
    expect(fixture.nativeElement.textContent).toContain('Custom Database Items');
    expect(fixture.nativeElement.textContent).toContain('Fuels');
    expect(fixture.nativeElement.textContent).not.toContain('Grid Factors');
    expect(fixture.nativeElement.textContent).not.toContain('Global Warming Potentials');
    expect(fixture.nativeElement.textContent).not.toContain('Account Settings');
  });

  it('shows emissions custom data navigation only when emissions display is enabled', () => {
    const { activeSection, account, activeDetail } = state;
    account.set({ guid: 'account-a', name: 'Account A', displayEmissions: true });
    activeSection.set('data');
    activeDetail.set('custom-grid-factors');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Grid Factors');
    expect(fixture.nativeElement.textContent).toContain('Fuels');
    expect(fixture.nativeElement.textContent).toContain('Global Warming Potentials');
    expect(activeLinks(fixture.nativeElement).map(link => link.textContent?.trim())).toEqual(['Grid Factors']);
  });

  it('shows facility data navigation in facility context', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('predictors');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Facility Data');
    expect(fixture.nativeElement.textContent).toContain('Meters');
    expect(fixture.nativeElement.textContent).toContain('Meter Grouping');
    expect(fixture.nativeElement.textContent).toContain('Predictors');
    expect(fixture.nativeElement.textContent).toContain('Energy Uses');
    expect(fixture.nativeElement.textContent).not.toContain('Custom Database Items');
    expect(activeLinks(fixture.nativeElement).map(link => link.textContent?.trim())).toEqual(['Predictors']);
  });

  it('marks Meter Grouping active as its own facility data item', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meter-grouping');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(activeLinks(element).map(link => link.textContent?.trim())).toEqual(['Meter Grouping']);
    expect(activeLinks(element)[0].getAttribute('href')).toContain('/v1/workspace/facility/facility-a/data/meter-grouping');
  });

  it('shows sorted meter group links under Meter Grouping on group routes', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, facilityMeterGroups } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meter-grouping');
    facilityMeterGroups.set([
      { guid: 'group-water', name: 'Water Group' },
      { guid: 'group-electric', name: 'Electric Group' }
    ]);
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const toggle = element.querySelector<HTMLButtonElement>('.v1-nav__child-toggle');
    const childLinks = groupChildLinks(element);

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(childLinks.map(link => link.querySelector('span')?.textContent?.trim())).toEqual(['Electric Group', 'Water Group']);
    expect(fixture.componentInstance.groups()[1].children.map(group => group.icon)).toEqual(['meterGroupItem', 'meterGroupItem']);
    expect(childLinks[0].getAttribute('href')).toContain('/v1/workspace/facility/facility-a/data/meter-grouping/group-electric/monthly-table');
    expect(activeLinks(element).map(link => link.textContent?.trim())).toEqual(['Meter Grouping']);
  });

  it('marks an individual meter group link active on group workbench routes', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, activeMeterGroupGuid, facilityMeterGroups } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meter-grouping');
    activeMeterGroupGuid.set('group-water');
    facilityMeterGroups.set([
      { guid: 'group-electric', name: 'Electric Group' },
      { guid: 'group-water', name: 'Water Group' }
    ]);
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const currentLinks = Array.from<HTMLAnchorElement>(element.querySelectorAll('[aria-current="page"]'));

    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0].textContent).toContain('Water Group');
    expect(currentLinks[0].classList.contains('v1-nav__child')).toBe(true);
  });

  it('shows sorted meter links under an expanded meters parent on meter routes', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, facilityMeters } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    facilityMeters.set([
      meterNav('meter-gas', 'Gas Backup', 'Natural Gas'),
      meterNav('meter-electric', 'Electric Main', 'Electricity')
    ]);
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const toggle = element.querySelector<HTMLButtonElement>('.v1-nav__child-toggle');
    const childLinks = meterChildLinks(element);

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(childLinks.map(link => link.querySelector('span')?.textContent?.trim())).toEqual(['Electric Main', 'Gas Backup']);
    expect(fixture.componentInstance.groups()[0].children.map(meter => meter.icon)).toEqual(['electricity', 'naturalGas']);
    expect(childLinks[0].getAttribute('href')).toContain('/v1/workspace/facility/facility-a/data/meters/meter-electric/settings');
    expect(activeLinks(element).map(link => link.textContent?.trim())).toEqual(['Meters']);
  });

  it('collapses and re-expands meter links on meter routes', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, facilityMeters } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    facilityMeters.set([meterNav('meter-electric', 'Electric Main')]);
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const toggle = element.querySelector<HTMLButtonElement>('.v1-nav__child-toggle');
    expect(meterChildLinks(element)).toHaveLength(1);

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(meterChildLinks(element)).toHaveLength(0);

    toggle?.click();
    fixture.detectChanges();

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(meterChildLinks(element)).toHaveLength(1);
  });

  it('keeps meter child links collapsed outside Meters routes', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, facilityMeters } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meter-grouping');
    facilityMeters.set([meterNav('meter-electric', 'Electric Main')]);
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector<HTMLButtonElement>('.v1-nav__child-toggle')).toBeNull();
    expect(meterChildLinks(element)).toHaveLength(0);
    expect(activeLinks(element).map(link => link.textContent?.trim())).toEqual(['Meter Grouping']);

    selectedFacility.set({ guid: 'facility-b', name: 'Facility B' });
    fixture.detectChanges();

    expect(meterChildLinks(element)).toHaveLength(0);
  });

  it('marks an individual meter link active on meter workbench routes', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, activeMeterGuid, facilityMeters } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    activeMeterGuid.set('meter-gas');
    facilityMeters.set([
      meterNav('meter-electric', 'Electric Main'),
      meterNav('meter-gas', 'Gas Backup', 'Natural Gas')
    ]);
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const currentLinks = Array.from<HTMLAnchorElement>(element.querySelectorAll('[aria-current="page"]'));

    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0].textContent).toContain('Gas Backup');
    expect(currentLinks[0].classList.contains('v1-nav__child')).toBe(true);
  });

  it('shows severity count badges for the meters parent and affected meter child', () => {
    const { activeSection, contextMode, selectedFacility, account, activeDetail, facilityMeters, statusState, statusItems } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    facilityMeters.set([meterNav('meter-electric', 'Electric Main')]);
    const entity = { kind: 'meter' as const, guid: 'meter-electric', name: 'Electric Main', accountGuid: 'account-a', facilityGuid: 'facility-a' };
    statusItems.set(presentFindings([
      makeFinding('meter.configuration.invalid', 'error', 'configuration', entity, { fields: ['name'] }),
      makeFinding('meter.currency.stale', 'warning', 'currency', entity, { latestPeriod: '2026-01', thresholdMonths: 3 })
    ]));

    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const badges = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-status-attention'));

    expect(badges).toHaveLength(2);
    expect(badges.every(badge => badge.textContent?.includes('2 issues: 1 error, 1 warning'))).toBe(true);
    expect(badges.every(badge => badge.classList.contains('v1-badge--danger'))).toBe(true);

    statusState.set('evaluating');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.v1-status-attention')).toHaveLength(0);
  });

  it('does not show a meter child toggle when there are no meters', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.v1-nav__child-toggle')).toBeNull();
    expect(meterChildLinks(element)).toHaveLength(0);
  });

  it('shows sorted, collapsible predictor links and marks the selected predictor active', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, activePredictorGuid, facilityPredictors } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('predictors');
    activePredictorGuid.set('predictor-z');
    facilityPredictors.set([
      { guid: 'predictor-z', name: 'Zulu Output' },
      { guid: 'predictor-a', name: 'Alpha Output' }
    ]);
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('[aria-label="Hide predictor links"]');

    expect(predictorChildLinks(element).map(link => link.textContent?.trim())).toEqual(['Alpha Output', 'Zulu Output']);
    expect(predictorChildLinks(element)[0].getAttribute('href')).toContain('/data/predictors/predictor-a/settings');
    expect(element.querySelector('[aria-current="page"]')?.textContent).toContain('Zulu Output');

    toggle?.click();
    fixture.detectChanges();
    expect(predictorChildLinks(element)).toHaveLength(0);
  });

  it('groups weather predictors by station so sidebar attention matches the station workbench', () => {
    const { activeSection, contextMode, selectedFacility, account, activeDetail, activeWeatherPredictorGroupKey, facilityPredictors, statusItems } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('predictors');
    activeWeatherPredictorGroupKey.set('station:KORD');
    const weatherPredictors = [
      { guid: 'cdd', name: 'CDD 65', predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare', weatherDataType: 'CDD' },
      { guid: 'hdd', name: 'HDD 60', predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare', weatherDataType: 'HDD' },
      { guid: 'humidity', name: 'Relative Humidity', predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare', weatherDataType: 'relativeHumidity' }
    ];
    facilityPredictors.set([
      ...weatherPredictors,
      { guid: 'production', name: 'Production', predictorType: 'Standard' }
    ]);
    const entity = (guid: string, name: string) => ({
      kind: 'predictor' as const, guid, name, accountGuid: 'account-a', facilityGuid: 'facility-a'
    });
    statusItems.set(presentFindings([
      ...weatherPredictors.flatMap(predictor => [
        makeFinding('predictor.weather.warning', 'warning', 'quality', entity(predictor.guid, predictor.name)),
        makeFinding('predictor.currency.stale', 'warning', 'currency', entity(predictor.guid, predictor.name), {
          latestPeriod: '2025-12', thresholdMonths: 3
        })
      ]),
      makeFinding('predictor.quality.outlier', 'warning', 'quality', entity('cdd', 'CDD 65'), {
        count: 1, periods: ['2025-12']
      })
    ]));

    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const links = predictorChildLinks(fixture.nativeElement);

    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain('Chicago O’Hare');
    expect(links[0].querySelector('.v1-status-attention')?.textContent).toContain('7');
    expect(links[0].getAttribute('href')).toContain('/predictors/weather/station:KORD/setup');
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[1].textContent).toContain('Production');
    const outputs = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-nav__weather-output'));
    expect(outputs.map(output => output.textContent?.trim())).toEqual(['CDD 65', 'HDD 60', 'Relative Humidity']);
    expect(outputs).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('.v1-nav__weather-outputs a')).toHaveLength(0);
    expect(outputs.every(output => output.querySelector('app-ui-icon'))).toBe(true);
    expect(links[0].getAttribute('title')).toBe('Chicago O’Hare');
  });

  it('shows active severity counts for the Predictors parent and affected child', () => {
    const { activeSection, contextMode, selectedFacility, account, activeDetail, facilityPredictors, statusState, statusItems } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('predictors');
    facilityPredictors.set([{ guid: 'predictor-a', name: 'Production' }]);
    const entity = { kind: 'predictor' as const, guid: 'predictor-a', name: 'Production', accountGuid: 'account-a', facilityGuid: 'facility-a' };
    statusItems.set(presentFindings([
      makeFinding('predictor.data.duplicate-month', 'error', 'quality', entity, { count: 1 }),
      makeFinding('predictor.quality.outlier', 'warning', 'quality', entity, { count: 2, periods: ['2026-01', '2026-02'] })
    ]));

    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const badges = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-status-attention'));

    expect(badges).toHaveLength(2);
    expect(badges.every(badge => badge.textContent?.includes('2 issues: 1 error, 1 warning'))).toBe(true);
    expect(badges.every(badge => badge.classList.contains('v1-badge--danger'))).toBe(true);

    statusItems.set(statusItems().filter(item => item.severity !== 'warning'));
    fixture.detectChanges();
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-status-attention'))
      .every(badge => badge.textContent?.includes('1 issue: 1 error, 0 warnings'))).toBe(true);

    statusState.set('evaluating');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.v1-status-attention')).toHaveLength(0);
  });

  it('does not show a predictor child toggle when there are no predictors', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail } = state;
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('predictors');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label$="predictor links"]')).toBeNull();
  });

  it('links account custom data from the single-facility Data sidebar', () => {
    const { activeSection, contextMode, selectedFacility, account, isSingleSiteWorkspace, activeDetail } = state;
    isSingleSiteWorkspace.set(true);
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Facility Data');
    expect(element.textContent).toContain('Custom Database Items');
    expect(element.textContent).toContain('Fuels');
    expect(element.textContent).not.toContain('Grid Factors');
    expect(element.textContent).not.toContain('Global Warming Potentials');
    const fuelLink = element.querySelector<HTMLAnchorElement>('a[href$="/data/custom-fuels"]');
    expect(fuelLink?.getAttribute('href')).toBe('/v1/workspace/facility/facility-a/data/custom-fuels');
    expect(fuelLink?.classList.contains('active')).toBe(false);
    expect(fuelLink?.hasAttribute('aria-current')).toBe(false);

    activeDetail.set('custom-fuels');
    fixture.detectChanges();

    expect(fuelLink?.classList.contains('active')).toBe(true);
    expect(fuelLink?.getAttribute('aria-current')).toBe('page');
  });

  it('includes emissions custom data in the single-facility sidebar when emissions display is enabled', () => {
    const { activeSection, contextMode, selectedFacility, account, isSingleSiteWorkspace, activeDetail } = state;
    account.set({
      guid: 'account-a',
      name: 'Account A',
      isSingleFacilityCompany: true,
      displayEmissions: true
    });
    isSingleSiteWorkspace.set(true);
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeSection.set('data');
    activeDetail.set('meters');
    const fixture = TestBed.createComponent(DataNavComponent);
    fixture.detectChanges();
    const links = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('.v1-nav__subgroup a')
    );

    expect(links.map(link => link.textContent?.trim())).toEqual([
      'Grid Factors',
      'Fuels',
      'Global Warming Potentials'
    ]);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/v1/workspace/facility/facility-a/data/custom-grid-factors',
      '/v1/workspace/facility/facility-a/data/custom-fuels',
      '/v1/workspace/facility/facility-a/data/custom-gwps'
    ]);
  });

  it('hides counts during evaluation failures and restores them when checks are ready', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, facilityMeters, statusItems, statusState } = state;
    activeSection.set('data');
    activeDetail.set('meters');
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    facilityMeters.set([meterNav('meter-a', 'Meter A')]);
    statusItems.set(presentFindings([makeFinding('meter.data.missing', 'error', 'completeness', {
      kind: 'meter', guid: 'meter-a', name: 'Meter A', accountGuid: 'account-a', facilityGuid: 'facility-a'
    })]));
    const fixture = TestBed.createComponent(DataNavComponent);
    for (const status of ['ready', 'evaluating', 'error', 'ready'] as const) {
      statusState.set(status);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.v1-status-attention')).toHaveLength(status === 'ready' ? 2 : 0);
      if (status === 'ready') expect(fixture.nativeElement.querySelector('.v1-alert')).toBeNull();
      else expect(fixture.nativeElement.textContent).toContain(status === 'error' ? 'Workspace status could not be evaluated.' : 'Checking workspace data...');
    }
  });

});
