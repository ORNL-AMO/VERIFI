import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { AnalysisNavComponent } from './analysis-nav.component';
import { setupSectionNavTest, analysisNav } from '../section-nav-test.helpers';

describe('AnalysisNavComponent', () => {
  let state: ReturnType<typeof setupSectionNavTest>;
  beforeEach(() => { state = setupSectionNavTest(); });

  it('shows the active analysis name and ordered workbench stages in the Analysis sidebar', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, activeAnalysisGuid, activeAnalysisGroupGuid, activeAnalysisStageScope, facilityMeterGroups, selectedFacilityAnalyses } = state;
    activeSection.set('analysis');
    activeDetail.set('workbench');
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeAnalysisGuid.set('analysis-a');
    activeAnalysisGroupGuid.set('group-b');
    activeAnalysisStageScope.set('group');
    facilityMeterGroups.set([
      { guid: 'group-a', name: 'Electricity' },
      { guid: 'group-b', name: 'Natural Gas' }
    ]);
    selectedFacilityAnalyses.set([{
      guid: 'analysis-a',
      name: 'FY 2025 Energy Analysis',
      analysisCategory: 'energy',
      groups: [
        { idbGroupId: 'group-b', analysisType: 'regression' },
        { idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption' }
      ]
    }, {
      guid: 'analysis-b',
      name: 'Other Energy Analysis',
      analysisCategory: 'energy',
      groups: []
    }]);

    const fixture = TestBed.createComponent(AnalysisNavComponent);
    fixture.detectChanges();
    const workflow: HTMLElement = fixture.nativeElement.querySelector('.v1-nav__analysis-workflow');
    const analysisLink: HTMLAnchorElement = fixture.nativeElement.querySelector('.v1-nav__analysis-link');

    expect(analysisLink.textContent).toContain('FY 2025 Energy Analysis');
    expect(analysisLink.classList.contains('active')).toBe(true);
    expect(analysisLink.getAttribute('aria-expanded')).toBe('true');
    expect(analysisLink.hasAttribute('aria-current')).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.v1-nav__analysis-link[aria-expanded="false"]')).toHaveLength(1);
    expect([...workflow.querySelectorAll('.v1-analysis-stages__label')].map(item => item.textContent?.trim()))
      .toEqual(['Analysis Setup', 'Natural Gas', 'Electricity', 'Facility Results', 'Used By']);
    expect(workflow.querySelector('[aria-current="step"]')?.textContent).toContain('Natural Gas');
    expect(workflow.querySelectorAll('a').length).toBe(5);
    expect(workflow.querySelector('.v1-workflow-stepper__number')).toBeNull();
    expect([...workflow.querySelectorAll('.v1-analysis-stages__marker')].map(marker => marker.textContent?.trim()))
      .toEqual(['Complete', 'Complete', 'Complete', 'Results', 'Dependencies']);
    const icons = fixture.debugElement.queryAll(By.css('.v1-nav__analysis-workflow .v1-analysis-stages__marker app-ui-icon'))
      .map(element => element.componentInstance.name);
    expect(icons).toEqual(['checkmarkBadge', 'checkmarkBadge', 'checkmarkBadge', 'chartAnalysis', 'link']);
  });

  it('ignores stale active selections and omits empty analysis groups', () => {
    const { activeSection, contextMode, selectedFacility, selectedFacilityAnalyses } = state;
    activeSection.set('analysis');
    contextMode.set('facility');
    selectedFacility.set({
      guid: 'facility-a',
      name: 'Facility A',
      selectedEnergyAnalysisId: 'missing-analysis'
    });
    selectedFacilityAnalyses.set([analysisNav('energy-a', 'Energy Analysis', 'energy')]);

    const fixture = TestBed.createComponent(AnalysisNavComponent);
    fixture.detectChanges();
    const sections = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-nav__analysis-section'));

    expect(sections).toHaveLength(1);
    expect(sections[0].querySelector('.v1-nav__sublabel')?.textContent).toContain('Energy');
    expect(sections[0].textContent).toContain('Energy Analysis');
    expect(fixture.nativeElement.textContent).not.toContain('Active for Reporting');
    expect(fixture.nativeElement.textContent).not.toContain('Water');
  });

  it('shows an accessible empty marker for an incomplete analysis stage', () => {
    const { activeSection, contextMode, selectedFacility, account, activeDetail, activeAnalysisGuid, activeAnalysisGroupGuid, activeAnalysisStageScope, facilityMeterGroups, selectedFacilityAnalyses, statusItems } = state;
    activeSection.set('analysis');
    activeDetail.set('workbench');
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeAnalysisGuid.set('analysis-a');
    activeAnalysisGroupGuid.set('group-b');
    activeAnalysisStageScope.set('group');
    facilityMeterGroups.set([{ guid: 'group-b', name: 'Natural Gas' }]);
    selectedFacilityAnalyses.set([{
      guid: 'analysis-a',
      name: 'FY 2025 Energy Analysis',
      analysisCategory: 'energy',
      groups: [{ idbGroupId: 'group-b', analysisType: 'regression' }]
    }]);
    statusItems.set(presentFindings([makeFinding(
      'analysis-group.setup.invalid',
      'error',
      'configuration',
      {
        kind: 'analysis-group',
        guid: 'analysis-a:group-b',
        name: 'Natural Gas',
        accountGuid: 'account-a',
        facilityGuid: 'facility-a'
      },
      { fields: ['analysisType'], analysisType: 'regression' }
    )]));

    const fixture = TestBed.createComponent(AnalysisNavComponent);
    fixture.detectChanges();
    const current = fixture.nativeElement.querySelector('[aria-current="step"]') as HTMLElement;
    const icons = fixture.debugElement.queryAll(By.css('.v1-nav__analysis-workflow .v1-analysis-stages__marker app-ui-icon'))
      .map(element => element.componentInstance.name);

    expect(current.textContent).toContain('Has blocking errors');
    expect(icons).toContain('badgeAlert');
  });

  it('shows the context-specific Analysis dashboard navigation without marking workbench routes active', () => {
    const { activeSection, contextMode, selectedFacility, account, activeDetail } = state;
    activeSection.set('analysis');
    activeDetail.set('dashboard');
    const fixture = TestBed.createComponent(AnalysisNavComponent);
    fixture.detectChanges();

    let element: HTMLElement = fixture.nativeElement;
    let dashboardLink = element.querySelector<HTMLAnchorElement>('a[href$="/analysis/dashboard"]');
    expect(element.textContent).toContain('Account Analysis');
    expect(dashboardLink?.getAttribute('aria-current')).toBe('page');
    expect(dashboardLink?.getAttribute('href')).toBe('/v1/workspace/account/account-a/analysis/dashboard');

    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    fixture.detectChanges();

    element = fixture.nativeElement;
    dashboardLink = element.querySelector<HTMLAnchorElement>('a[href$="/analysis/dashboard"]');
    expect(element.textContent).toContain('Facility Analysis');
    expect(dashboardLink?.getAttribute('href')).toBe('/v1/workspace/facility/facility-a/analysis/dashboard');

    activeDetail.set('workbench');
    fixture.detectChanges();
    expect(dashboardLink?.getAttribute('aria-current')).toBeNull();
    expect(dashboardLink?.classList.contains('active')).toBe(false);
  });

  it('lists active analyses first and groups remaining analyses by category', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, selectedFacilityAnalyses } = state;
    activeSection.set('analysis');
    activeDetail.set('dashboard');
    contextMode.set('facility');
    selectedFacility.set({
      guid: 'facility-a',
      name: 'Facility A',
      selectedEnergyAnalysisId: 'energy-active',
      selectedWaterAnalysisId: 'water-active'
    });
    selectedFacilityAnalyses.set([
      analysisNav('water-z', 'Zulu Water', 'water'),
      analysisNav('energy-z', 'Zulu Energy', 'energy'),
      analysisNav('water-active', 'Official Water', 'water'),
      analysisNav('energy-active', 'Official Energy', 'energy'),
      analysisNav('energy-a', 'Alpha Energy', 'energy'),
      analysisNav('water-a', 'Alpha Water', 'water')
    ]);

    const fixture = TestBed.createComponent(AnalysisNavComponent);
    fixture.detectChanges();
    const sections = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-nav__analysis-section'));
    const namesFor = (section: HTMLElement): string[] =>
      Array.from<HTMLElement>(section.querySelectorAll('.v1-nav__analysis-link .v1-nav__item-label'))
        .map(item => item.textContent?.trim() || '');

    expect(sections.map(section => section.querySelector('.v1-nav__sublabel')?.textContent?.trim()))
      .toEqual(['Active for Reporting', 'Energy', 'Water']);
    expect(namesFor(sections[0])).toEqual(['Official Energy', 'Official Water']);
    expect(namesFor(sections[1])).toEqual(['Alpha Energy', 'Zulu Energy']);
    expect(namesFor(sections[2])).toEqual(['Alpha Water', 'Zulu Water']);
    expect(fixture.debugElement.queryAll(By.css('.v1-nav__analysis-link app-ui-icon'))
      .map(element => element.componentInstance.name))
      .toEqual(['energy', 'droplet', 'energy', 'energy', 'droplet', 'droplet']);
    expect(sections[0].querySelectorAll('.v1-nav__analysis-link')).toHaveLength(2);
    expect(sections[1].querySelector<HTMLAnchorElement>('.v1-nav__analysis-link')?.getAttribute('href'))
      .toContain('/analysis/workbench/energy-a/setup');
    expect(fixture.nativeElement.querySelector('.v1-nav__analysis-workflow')).toBeNull();
  });

  it('lists account analyses and expands the selected four-stage workflow', () => {
    const { activeSection, contextMode, account, activeDetail, activeAnalysisGuid, activeAccountAnalysisStageScope, accountAnalyses } = state;
    activeSection.set('analysis');
    activeDetail.set('workbench');
    contextMode.set('account');
    activeAnalysisGuid.set('account-analysis-a');
    activeAccountAnalysisStageScope.set('results');
    account.set({
      guid: 'account-a',
      name: 'Account A',
      selectedEnergyAnalysisId: 'account-analysis-a'
    });
    accountAnalyses.set([
      {
        ...analysisNav('account-analysis-a', 'Portfolio Energy', 'energy'),
        accountId: 'account-a',
        baselineYear: 2020,
        facilityAnalysisItems: []
      },
      {
        ...analysisNav('account-analysis-b', 'Portfolio Water', 'water'),
        accountId: 'account-a',
        baselineYear: 2021,
        facilityAnalysisItems: []
      }
    ]);

    const fixture = TestBed.createComponent(AnalysisNavComponent);
    fixture.detectChanges();
    const workflow: HTMLElement = fixture.nativeElement.querySelector('.v1-nav__analysis-workflow');

    expect([...workflow.querySelectorAll('.v1-analysis-stages__label')].map(item => item.textContent?.trim()))
      .toEqual(['Setup', 'Select Facility Items', 'Results', 'Used By']);
    expect(workflow.querySelector('.is-current')?.textContent).toContain('Results');
    expect(fixture.nativeElement.textContent).toContain('Active for Reporting');
    expect(fixture.nativeElement.textContent).toContain('Portfolio Water');
    expect(workflow.querySelectorAll('a')).toHaveLength(3);
    expect(workflow.querySelector('[aria-disabled="true"]')?.textContent).toContain('Results');
  });

  it('uses neutral account navigation labels and icons until both categories apply', () => {
    state.activeSection.set('analysis'); state.contextMode.set('account');
    state.accountAnalyses.set([analysisNav('a', 'Annual plan', 'energy')]);
    const fixture = TestBed.createComponent(AnalysisNavComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-nav__sublabel').textContent.trim()).toBe('Analyses');
    expect(fixture.debugElement.query(By.css('.v1-nav__analysis-link app-ui-icon')).componentInstance.name).toBe('analysis');
    state.facilityMeters.set([{ guid: 'water', name: 'Water', source: 'Water Intake' }]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-nav__sublabel').textContent.trim()).toBe('Energy');
    expect(fixture.debugElement.query(By.css('.v1-nav__analysis-link app-ui-icon')).componentInstance.name).toBe('energy');
  });

  it('shows facility group warnings without blocking completion and distinguishes unavailable status', () => {
    const { activeSection, contextMode, selectedFacility, activeDetail, activeAnalysisGuid, activeAnalysisStageScope, facilityMeterGroups, selectedFacilityAnalyses, statusItems, statusState } = state;
    activeSection.set('analysis');
    activeDetail.set('workbench');
    contextMode.set('facility');
    selectedFacility.set({ guid: 'facility-a', name: 'Facility A' });
    activeAnalysisGuid.set('analysis-a');
    activeAnalysisStageScope.set('analysis');
    facilityMeterGroups.set([{ guid: 'group-a', name: 'Electricity' }]);
    selectedFacilityAnalyses.set([{
      guid: 'analysis-a', name: 'Analysis A', analysisCategory: 'energy',
      groups: [{ idbGroupId: 'group-a', analysisType: 'regression' }]
    }]);
    statusItems.set(presentFindings([makeFinding('analysis-group.model.invalid', 'warning', 'quality', {
      kind: 'analysis-group', guid: 'analysis-a:group-a', name: 'Electricity', accountGuid: 'account-a', facilityGuid: 'facility-a'
    })]));
    const fixture = TestBed.createComponent(AnalysisNavComponent);
    fixture.detectChanges();
    const stage: HTMLElement = fixture.nativeElement.querySelectorAll('.v1-analysis-stages li')[1];
    expect(stage.textContent).toContain('Complete');
    expect(stage.textContent).toContain('1 issue: 0 errors, 1 warning');
    expect(stage.querySelector('a')).not.toBeNull();

    for (const unavailable of ['evaluating', 'error'] as const) {
      statusState.set(unavailable);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.v1-status-attention')).toBeNull();
      expect(fixture.nativeElement.querySelector(unavailable === 'error' ? '[role="alert"]' : '[role="status"]')).not.toBeNull();
    }
    statusState.set('ready');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-status-attention')?.textContent).toContain('1');
    // The status service publishes active findings only after a warning is discarded.
    statusItems.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-status-attention')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.v1-analysis-stages li')[1].textContent).toContain('Complete');
  });

});
