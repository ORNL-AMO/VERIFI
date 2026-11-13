import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { LibraryModule } from '../../library/library.module';
import { LibraryLifecycle } from '../../library/lifecycle/library-lifecycle.service';
import { buildVisualizationLibrary } from '../../library/visualization-library.models';
import { configureLibraryTest, libraryRecord } from '../../library/testing/library-testing';
import { CreationComponent } from './creation-drawer.component';
import { group, meter, reading } from '@app/v1/data/meters/facility-meters.testing';

describe('visualization creation drawer', () => {
  it.each(['energy-trend', 'cost-trend'] as const)('distinguishes same-named portfolio meters by facility when binding %s', async recipe => {
    const { commands, workspace } = configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    const snapshot = workspace.snapshot()!;
    workspace.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b', name: 'Facility B' },
        { ...snapshot.facilities[0], guid: 'facility-c', name: '' }],
      meters: [meter({ name: 'Main' }), meter({ guid: 'meter-b', facilityId: 'facility-b', name: 'Main', noLongerInUse: true }),
        meter({ guid: 'meter-c', facilityId: 'facility-c', name: 'Main' })],
      meterData: [reading({}), reading({ guid: 'bill-b', meterId: 'meter-b', facilityId: 'facility-b' }),
        reading({ guid: 'bill-c', meterId: 'meter-c', facilityId: 'facility-c' })] });
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    try {
      lifecycle.openCreate(); lifecycle.selectScope('portfolio'); lifecycle.selectRecipe(recipe);
      if (recipe === 'energy-trend') lifecycle.selectRecipeGrouping('meters');
      fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const cards = [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Trend resources"] button')];
      expect(cards.map(card => card.querySelector('strong')?.textContent)).toEqual(['Main', 'Main', 'Main']);
      expect(cards.map(card => card.querySelector('.creation-choice__description')?.textContent)).toEqual([
        'Electricity · Facility A', 'Electricity · Facility B · Retired', 'Electricity · Unnamed facility'
      ]);
      cards[1].click(); fixture.detectChanges();
      expect(lifecycle.form.controls.recipeResourceIds.value).toEqual(['meter-b']);
      lifecycle.continueRecipe(); await lifecycle.submit();
      expect(commands.prepareCreate).toHaveBeenCalledOnce();
      expect(commands.prepareCreate.mock.calls[0][0].sources[0]).toMatchObject({ selection: { kind: 'fixed', resource: 'meter', guids: ['meter-b'] } });
    } finally { fixture.destroy(); }
  });
  it('steps through chart and multiple data sources before requiring a name', async () => {
    const { commands } = configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent!.trim() === label)!;
    expect([...root.querySelectorAll('[aria-label="Visualization ownership"] button')].map(item => item.getAttribute('aria-pressed')))
      .toEqual(['false', 'false']);
    expect(root.querySelector('input[formcontrolname="name"]')).toBeNull(); button('Portfolio').click(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const chartButtons = fixture.debugElement.queryAll(By.css('[aria-label="Chart type"] button'));
    expect(chartButtons.map(button => button.query(By.css('strong')).nativeElement.textContent))
      .toEqual(['Line', 'Bar', 'Scatter', 'Correlation', 'Heatmap', 'Donut', 'Treemap', 'Sankey']);
    expect(chartButtons.map(button => button.query(By.directive(IconComponent)).componentInstance.name))
      .toEqual(fixture.componentInstance.charts.map(chart => chart.icon));
    [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Chart type"] button')].find(item => item.querySelector('strong')?.textContent === 'Scatter')!.click(); fixture.detectChanges();
    const sourceKinds = root.querySelector('[aria-label="Data Sources"]')!; expect(sourceKinds.children).toHaveLength(4);
    const sourceCards = fixture.debugElement.queryAll(By.css('[aria-label="Data Sources"] button'));
    expect(sourceCards.map(card => card.queryAll(By.directive(IconComponent))[1].componentInstance.name))
      .toEqual(['meter', 'predictor', 'energyUseGroup', 'analysis']);
    expect(sourceCards.map(card => card.query(By.css('.creation-choice__selection')).componentInstance.name))
      .toEqual(['circle', 'circle', 'circle', 'circle']);
    const chartSelection = fixture.debugElement.queryAll(By.css('.creation-selection'))
      .find(selection => selection.nativeElement.textContent.includes('Scatter'))!;
    expect(chartSelection.query(By.directive(IconComponent)).componentInstance.name).toBe('chartScatter');
    expect(button('Continue').disabled).toBe(true); button('Meters').click(); button('Predictors').click(); fixture.detectChanges();
    expect(button('Meters').getAttribute('aria-pressed')).toBe('true'); expect(button('Predictors').getAttribute('aria-pressed')).toBe('true');
    expect(sourceCards.map(card => card.query(By.css('.creation-choice__selection')).componentInstance.name))
      .toEqual(['success', 'success', 'circle', 'circle']);
    expect(lifecycle.step()).toBe('sources'); expect(button('Continue').disabled).toBe(false);
    button('Continue').click(); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('label[for="visualization-name"]')).not.toBeNull(); await lifecycle.submit(); fixture.detectChanges();
    expect(root.textContent).toContain('Enter a visualization name.'); expect(commands.submit).not.toHaveBeenCalled();
    lifecycle.form.controls.name.setValue('Weather and usage'); fixture.detectChanges(); button('Add visualization').click(); await fixture.whenStable();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ chart: { kind: 'scatter', showFit: false }, sources: [{ kind: 'utility' }, { kind: 'predictor' }] });
    fixture.destroy();
  });
  it.each([
    { label: 'Source', resource: 'Electricity', icon: 'electricity', groupBy: 'source' },
    { label: 'Meter group', resource: 'Production', icon: 'meterGroupItem', groupBy: 'group' },
    { label: 'Meters', resource: 'Main meter', icon: 'electricity', groupBy: 'meter' }
  ])('creates an energy trend through $label icon cards', async choice => {
    const { workspace, commands } = configureLibraryTest([LibraryModule]);
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({ name: 'Main meter', groupId: 'group-a' })],
      meterGroups: [group({ guid: 'group-a', name: 'Production' })], meterData: [reading({})] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.selectScope('portfolio'); lifecycle.selectRecipe('energy-trend');
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent!.trim() === label)!;
    const groupingCards = fixture.debugElement.queryAll(By.css('[aria-label="View meters by"] button'));
    expect(groupingCards.map(card => card.query(By.directive(IconComponent)).componentInstance.name)).toEqual(['energy', 'meterGroupItem', 'meter']);
    button(choice.label).click(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('select')).toBeNull(); expect(button('Continue').disabled).toBe(true);
    const resourceCard = fixture.debugElement.query(By.css('[aria-label="Trend resources"] button'));
    expect(resourceCard.queryAll(By.directive(IconComponent))[1].componentInstance.name).toBe(choice.icon);
    expect(resourceCard.query(By.css('.creation-choice__selection')).componentInstance.name).toBe('circle');
    resourceCard.nativeElement.click(); fixture.detectChanges();
    expect(resourceCard.nativeElement.getAttribute('aria-pressed')).toBe('true');
    expect(resourceCard.query(By.css('.creation-choice__selection')).componentInstance.name).toBe('success');
    resourceCard.nativeElement.click(); fixture.detectChanges(); expect(button('Continue').disabled).toBe(true);
    resourceCard.nativeElement.click(); fixture.detectChanges(); button('Continue').click(); fixture.detectChanges();
    button('Add visualization').click(); await fixture.whenStable();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ name: 'Energy usage trend', sources: [{ groupBy: choice.groupBy }] });
    fixture.destroy();
  });
  it('searches facilities without changing the draft and resets the search on reopening', async () => {
    const { workspace } = configureLibraryTest([LibraryModule]);
    const snapshot = workspace.snapshot()!, facility = snapshot.facilities[0];
    workspace.publish({ ...snapshot, account: { ...snapshot.account, portfolioFacilityOrder: ['facility-b', 'facility-a'] },
      facilities: [facility, { ...facility, guid: 'facility-b', name: 'Boiler plant' }] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.selectScope('facility'); fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const names = () => [...root.querySelectorAll('[aria-label="Facility"] strong')].map(item => item.textContent);
    expect(names()).toEqual(['Boiler plant', 'Facility A']);
    expect(root.textContent).not.toContain('Choose an available facility.');
    const draft = lifecycle.form.getRawValue();
    const search = root.querySelector<HTMLInputElement>('#visualization-facility-search')!;
    search.value = '  BOILER '; search.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(names()).toEqual(['Boiler plant']); expect(lifecycle.form.getRawValue()).toEqual(draft);
    search.value = 'missing'; search.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('No matching facilities.');
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent!.trim() === 'Clear search')!.click();
    fixture.detectChanges(); expect(search.value).toBe(''); expect(names()).toEqual(['Boiler plant', 'Facility A']);
    root.querySelector<HTMLButtonElement>('[aria-label="Facility"] button')!.click(); fixture.detectChanges();
    expect(lifecycle.form.controls.facilityGuid.value).toBe('facility-b'); expect(lifecycle.step()).toBe('chart');
    lifecycle.facilitySearch.setValue('previous search'); lifecycle.discard(); lifecycle.openCreate(); fixture.detectChanges();
    expect(lifecycle.facilitySearch.value).toBe(''); expect(lifecycle.selectedScope()).toBeNull();
    fixture.destroy();
  });
  it('clears later selection chips immediately when the facility chip is clicked', async () => {
    const { workspace, commands } = configureLibraryTest([LibraryModule]);
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({})], meterData: [reading({})] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.selectScope('facility'); lifecycle.selectFacility('facility-a'); lifecycle.selectRecipe('cost-trend');
    lifecycle.toggleRecipeResource('meter-a'); lifecycle.continueRecipe();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Utility cost trend');
    root.querySelector<HTMLButtonElement>('[aria-label="Change Facility A"]')!.click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect([...root.querySelectorAll('.creation-selection')].map(button => button.textContent!.trim())).toEqual(['Facility', 'Facility A']);
    expect(root.textContent).not.toContain('Utility cost trend'); expect(root.querySelector('[aria-label="Trend resources"]')).toBeNull();
    expect(root.querySelector('input[formcontrolname="name"]')).toBeNull(); expect(lifecycle.form.controls.name.value).toBe('');
    expect(root.querySelector('#visualization-choice-heading')?.textContent).toBe('Facility');
    root.querySelector<HTMLButtonElement>('[aria-label="Facility"] button')!.click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[aria-label="Chart type"] [aria-pressed="true"]')).toBeNull();
    expect(commands.prepareCreate).not.toHaveBeenCalled(); fixture.destroy();
  });
  it('keeps rename as a name-only form', async () => {
    const { workspace } = configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    workspace.publish({ ...workspace.snapshot()!, savedVisualizations: [libraryRecord()] });
    const fixture = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.rename(buildVisualizationLibrary(workspace.snapshot()!)[0]); fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Rename visualization'); expect(root.querySelector('input[formcontrolname="name"]')).not.toBeNull();
    expect(root.querySelector('.creation-choices')).toBeNull(); expect(root.querySelector('.creation-selections')).toBeNull(); fixture.destroy();
  });
  it('uses the shell portal for protected discard and keeps the draft after Stay', async () => {
    configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); fixture.detectChanges();
    lifecycle.form.controls.name.setValue('Retain me'); lifecycle.requestClose(); fixture.detectChanges();
    const modal = TestBed.inject(ModalPortalService); expect(modal.activePortal()).not.toBeNull(); expect(modal.workspaceBlocked()).toBe(true);
    lifecycle.cancelConfirmation(); fixture.detectChanges(); expect(lifecycle.form.controls.name.value).toBe('Retain me'); expect(modal.activePortal()).toBeNull();
    fixture.destroy(); expect(modal.activePortal()).toBeNull();
  });
});
