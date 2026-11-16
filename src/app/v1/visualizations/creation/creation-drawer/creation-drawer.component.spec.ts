import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { LibraryModule } from '../../library/library.module';
import { LibraryLifecycle } from '../../library/lifecycle/library-lifecycle.service';
import { buildVisualizationLibrary } from '../../library/visualization-library.models';
import { configureLibraryTest, libraryRecord } from '../../library/testing/library-testing';
import { CreationComponent } from './creation-drawer.component';
import { FacilityPickerComponent } from '../../shared/facility-picker/facility-picker.component';
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
      lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectRecipe(recipe); lifecycle.selectMeterMode('meter');
      fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const cards = [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Meter resources"] button')];
      expect(cards.map(card => card.querySelector('strong')?.textContent)).toEqual(['Main', 'Main', 'Main']);
      expect(cards.map(card => card.querySelector('.creation-choice__description')?.textContent)).toEqual([
        'Facility A · Electricity', 'Facility B · Electricity · Retired', 'Unnamed facility · Electricity'
      ]);
      cards[1].click(); fixture.detectChanges();
      expect(lifecycle.form.controls.resourceIds.value).toEqual(['meter-b']);
      lifecycle.continueResources(); lifecycle.selectObservation('calendarized'); await lifecycle.submit();
      expect(commands.prepareCreate).toHaveBeenCalledOnce();
      expect(commands.prepareCreate.mock.calls[0][0].sources[0]).toMatchObject({ selection: { kind: 'fixed', resource: 'meter', guids: ['meter-b'] } });
    } finally { fixture.destroy(); }
  });
  it('starts facility-context creation at Chart and returns to the preselected facility cards with Back', async () => {
    const { workspace, facility } = configureLibraryTest([LibraryModule]);
    facility.set('facility-a');
    const snapshot = workspace.snapshot()!;
    workspace.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b', name: 'Facility B' }] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(lifecycle.step()).toBe('chart'); expect(root.querySelector('[aria-label="Chart type"]')).not.toBeNull();
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Back')!.click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(lifecycle.step()).toBe('facilities');
    expect(root.querySelector<HTMLInputElement>('input[aria-label="Facility A"]')!.checked).toBe(true);
    expect(root.querySelector<HTMLInputElement>('input[aria-label="Facility B"]')!.checked).toBe(false);
    expect(root.querySelector<HTMLInputElement>('input[aria-label="All Facilities"]')!.checked).toBe(false);
    root.querySelector<HTMLInputElement>('input[aria-label="Facility B"]')!.click(); fixture.detectChanges();
    expect(lifecycle.form.controls.facilitySelection.value).toEqual({ kind: 'all' });
    fixture.destroy();
  });
  it('steps through chart and multiple data sources before requiring a name', async () => {
    const { commands, workspace } = configureLibraryTest([LibraryModule]);
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({})] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent!.trim() === label)!;
    expect(root.querySelector('[aria-label="Included facilities"] [role="checkbox"]')?.getAttribute('aria-checked')).toBe('true');
    expect(root.querySelector('input[formcontrolname="name"]')).toBeNull(); button('Continue').click(); fixture.detectChanges();
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
    lifecycle.selectMeterMode('source'); lifecycle.toggleResource('Electricity'); lifecycle.continueResources(); lifecycle.selectObservation('calendarized'); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('label[for="visualization-name"]')).not.toBeNull(); await lifecycle.submit(); fixture.detectChanges();
    expect(root.textContent).toContain('Enter a visualization name.'); expect(commands.submit).not.toHaveBeenCalled();
    lifecycle.form.controls.name.setValue('Weather and usage'); fixture.detectChanges(); button('Add visualization').click(); await fixture.whenStable();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ chart: { kind: 'scatter', showFit: false }, sources: [{ kind: 'utility' }, { kind: 'predictor' }] });
    fixture.destroy();
  });
  it.each([
    { label: 'Source', resource: 'Electricity', icon: 'electricity', groupBy: 'source' },
    { label: 'Meter group', resource: 'Production', icon: 'meterGroupItem', groupBy: 'group' },
    { label: 'Individual meters', resource: 'Main meter', icon: 'electricity', groupBy: 'meter' }
  ])('creates an energy trend through $label icon cards', async choice => {
    const { workspace, commands } = configureLibraryTest([LibraryModule]);
    workspace.publish({ ...workspace.snapshot()!, meters: [meter({ name: 'Main meter', groupId: 'group-a' })],
      meterGroups: [group({ guid: 'group-a', name: 'Production' })], meterData: [reading({})] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.continueFacilities(); lifecycle.selectRecipe('energy-trend');
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent!.trim() === label)!;
    const groupingCards = fixture.debugElement.queryAll(By.css('[aria-label="View meters by"] button'));
    expect(groupingCards.map(card => card.query(By.css('strong')).nativeElement.textContent)).toEqual(['Source', 'Meter group', 'Individual meters']);
    expect(groupingCards.map(card => card.query(By.directive(IconComponent)).componentInstance.name)).toEqual(['energy', 'meterGroupItem', 'meter']);
    button(choice.label).click(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('select')).toBeNull(); expect(button('Continue').disabled).toBe(true);
    const resourceCard = fixture.debugElement.query(By.css('[aria-label="Meter resources"] button'));
    expect(resourceCard.queryAll(By.directive(IconComponent))[1].componentInstance.name).toBe(choice.icon);
    expect(resourceCard.query(By.css('.creation-choice__selection')).componentInstance.name).toBe('circle');
    resourceCard.nativeElement.click(); fixture.detectChanges();
    expect(resourceCard.nativeElement.getAttribute('aria-pressed')).toBe('true');
    expect(resourceCard.query(By.css('.creation-choice__selection')).componentInstance.name).toBe('success');
    resourceCard.nativeElement.click(); fixture.detectChanges(); expect(button('Continue').disabled).toBe(true);
    resourceCard.nativeElement.click(); fixture.detectChanges(); button('Continue').click(); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('[aria-label="Observation view"] button')!.click(); fixture.detectChanges();
    button('Add visualization').click(); await fixture.whenStable();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ name: 'Energy usage trend', sources: [{ groupBy: choice.groupBy }] });
    fixture.destroy();
  });
  it('shares the facility checklist, filters locally, and keeps the draft until Continue', async () => {
    const { workspace } = configureLibraryTest([LibraryModule]); const snapshot = workspace.snapshot()!, facility = snapshot.facilities[0];
    workspace.publish({ ...snapshot, account: { ...snapshot.account, portfolioFacilityOrder: ['facility-b', 'facility-a'] },
      facilities: [facility, { ...facility, guid: 'facility-b', name: 'Boiler plant' }] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); fixture.detectChanges(); await fixture.whenStable();
    const picker = fixture.debugElement.query(By.directive(FacilityPickerComponent)).componentInstance as FacilityPickerComponent;
    const before = lifecycle.form.getRawValue(); picker.search.setValue('BOILER'); fixture.detectChanges();
    expect(picker.rows().map(item => item.name)).toEqual(['Boiler plant']); expect(lifecycle.form.getRawValue()).toEqual(before);
    picker.search.setValue(''); picker.toggle('facility-a'); fixture.detectChanges();
    expect(lifecycle.form.controls.facilitySelection.value).toEqual({ kind: 'fixed', facilityGuids: ['facility-b'] });
    expect(lifecycle.step()).toBe('facilities'); lifecycle.continueFacilities(); expect(lifecycle.step()).toBe('chart'); fixture.destroy();
  });
  it('inspects earlier choices without clearing their selected resources or name', async () => {
    const { workspace } = configureLibraryTest([LibraryModule]); workspace.publish({ ...workspace.snapshot()!, meters: [meter({})] });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    lifecycle.openCreate(); lifecycle.selectFacilities({ kind: 'fixed', facilityGuids: ['facility-a'] }); lifecycle.continueFacilities(); lifecycle.selectRecipe('cost-trend');
    lifecycle.selectMeterMode('meter'); lifecycle.toggleResource('meter-a'); lifecycle.continueResources(); lifecycle.selectObservation('calendarized');
    const before = lifecycle.form.getRawValue(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Change Facility A"]')!.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(lifecycle.step()).toBe('facilities'); expect(lifecycle.form.getRawValue()).toEqual(before);
    expect(root.querySelector('#visualization-choice-heading')?.textContent).toBe('Facilities'); fixture.destroy();
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
