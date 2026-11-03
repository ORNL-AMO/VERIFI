import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { setupReportInventory } from '../../testing/report-inventory-test-setup';
import { reportFacility } from '../../facility/testing/report-test-fixtures';
import { ReportsInventoryComponent } from '../reports-inventory.component';

async function setup(scope: 'account' | 'facility' = 'account', facilities = 2) {
  const context = await setupReportInventory(scope);
  context.store.publish({ ...context.store.snapshot()!, facilities: Array.from({ length: facilities }, (_, index) =>
    ({ ...reportFacility, guid: index ? `facility-${index}` : 'facility-a', name: index ? `Facility ${index}` : 'Main facility' })) });
  const fixture = TestBed.createComponent(ReportsInventoryComponent); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement, lifecycle = fixture.componentInstance.lifecycle;
  fixture.componentInstance.openCreate(); fixture.detectChanges();
  const button = (text: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text)!;
  const choose = (text: string) => {
    const card = [...root.querySelectorAll<HTMLButtonElement>('.report-choice')].find(item => item.textContent?.trim() === text);
    (card || button(text)).click(); fixture.detectChanges();
  };
  const edit = (text: string) => { root.querySelector<HTMLButtonElement>(`[aria-label="Change ${text}"]`)!.click(); fixture.detectChanges(); };
  return { ...context, fixture, root, lifecycle, button, choose, edit };
}

describe('progressive report creation', () => {
  it('starts with just scope cards, pins each selection, and creates only after naming', async () => {
    const { root, fixture, lifecycle, choose, button, accountActions, navigate } = await setup();
    expect([...root.querySelectorAll('.report-choice')].map(item => item.textContent)).toEqual(['Account Report', 'Facility Report']);
    expect(root.querySelector('.report-progress')).toBeNull(); expect(root.textContent).not.toContain('Continue'); expect(root.textContent).not.toContain('Back');
    expect(root.querySelector('#report-name')).toBeNull();
    await lifecycle.submit(); expect(accountActions.create).not.toHaveBeenCalled();
    choose('Account Report');
    expect(lifecycle.step()).toBe('type'); expect(root.querySelector('.report-selections')!.textContent).toContain('Account Report');
    const card = fixture.debugElement.queryAll(By.css('.report-choice')).find(item => item.nativeElement.textContent.includes('Better Plants'))!;
    expect(card.query(By.directive(IconComponent)).componentInstance.name).toBe('betterPlantsReport');
    expect(card.nativeElement.textContent).not.toContain('Preview pending');
    choose('Better Plants');
    expect(root.querySelector<HTMLInputElement>('#report-name')!.value).toBe('Better Plants report');
    expect([...root.querySelectorAll('.report-selection span')].map(item => item.textContent)).toEqual(['Account Report', 'Better Plants']);
    expect(button('Create report').disabled).toBe(false); await lifecycle.submit();
    expect(accountActions.create).toHaveBeenCalledWith('Better Plants report', 'betterPlants');
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'reports', 'workbench', 'created-account', 'setup']);
  });

  it('searches facilities, pins ownership, and preserves type when changing the owner', async () => {
    const { root, fixture, lifecycle, choose, edit, store, facilityActions } = await setup();
    const original = store.selectedFacility(); choose('Facility Report');
    expect(lifecycle.step()).toBe('facility');
    const search = root.querySelector<HTMLInputElement>('#report-facility-search')!;
    search.value = 'NO MATCH'; search.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(root.querySelectorAll('.report-choice')).toHaveLength(0); expect(root.textContent).toContain('No matching facilities');
    choose('Clear search'); expect([...root.querySelectorAll('.report-choice strong')].map(item => item.textContent)).toEqual(['Facility 1', 'Main facility']);
    choose('Main facility'); choose('Data OverviewPreview pending');
    expect(root.querySelector('.report-selections')!.textContent).toContain('Main facility');
    edit('Main facility'); choose('Facility 1');
    expect(lifecycle.form.controls.type.value).toBe('overview'); choose('Data OverviewPreview pending'); await lifecycle.submit();
    expect(facilityActions.create).toHaveBeenCalledWith('facility-1', 'Data Overview report', 'overview'); expect(store.selectedFacility()).toBe(original);
  });

  it('pins fixed facility context and only offers facility report types', async () => {
    const { root, fixture, lifecycle, choose, store } = await setup('facility', 1);
    store.publish({ ...store.snapshot()!, account: { ...store.account()!, isSingleFacilityCompany: true } }); fixture.detectChanges();
    expect(lifecycle.step()).toBe('type'); expect(root.textContent).not.toContain('Better Plants');
    expect([...root.querySelectorAll<HTMLButtonElement>('.report-selection')].every(item => item.disabled)).toBe(true);
    expect(fixture.debugElement.query(By.css('.report-choice app-ui-icon')).componentInstance.name).toBe('facilityAnalysisReport');
    choose('Analysis'); expect(lifecycle.form.controls.facilityGuid.value).toBe('facility-a'); expect(lifecycle.canSave()).toBe(true);
  });

  it('updates suggestions and retains an edited name when pinned selections change', async () => {
    const { root, fixture, lifecycle, choose, edit } = await setup();
    choose('Account Report'); choose('AnalysisPreview pending'); edit('Analysis'); choose('Better Plants');
    expect(lifecycle.form.controls.name.value).toBe('Better Plants report');
    const name = root.querySelector<HTMLInputElement>('#report-name')!;
    name.value = 'Quarterly review'; name.dispatchEvent(new Event('input')); fixture.detectChanges();
    edit('Account Report'); choose('Facility Report');
    expect(lifecycle.form.controls.type.value).toBeNull(); expect(lifecycle.form.controls.facilityGuid.value).toBe('');
    choose('Main facility'); choose('Analysis'); expect(lifecycle.form.controls.name.value).toBe('Quarterly review');
    const currentName = root.querySelector<HTMLInputElement>('#report-name')!;
    currentName.value = '  '; currentName.dispatchEvent(new Event('input')); currentName.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(lifecycle.canSave()).toBe(false); expect(root.textContent).toContain('Enter a report name.');
  });

  it('revalidates removed choices and recovers through pinned selections', async () => {
    const { fixture, lifecycle, choose, edit, store, root, button } = await setup();
    choose('Facility Report'); choose('Main facility'); choose('Emission FactorsPreview pending');
    store.publish({ ...store.snapshot()!, account: { ...store.account()!, displayEmissions: false } }); fixture.detectChanges();
    expect(button('Create report').disabled).toBe(true); expect(root.textContent).toContain('report type is no longer available');
    edit('Emission Factors'); expect(root.querySelector('.report-choices')!.textContent).not.toContain('Emission Factors'); choose('Analysis');
    store.publish({ ...store.snapshot()!, facilities: store.facilities().filter(item => item.guid !== 'facility-a') }); fixture.detectChanges();
    expect(lifecycle.canSave()).toBe(false); expect(root.textContent).toContain('facility is no longer available');
    edit('Facility unavailable'); choose('Facility 1'); choose('Analysis'); expect(lifecycle.canSave()).toBe(true);
  });

  it('disables facility creation without facilities and closes unchanged choices without confirmation', async () => {
    const { root, lifecycle, button, choose } = await setup('account', 0);
    expect(button('Facility Report').disabled).toBe(true); expect(root.textContent).toContain('Add a facility first');
    choose('Cancel'); expect(lifecycle.editor()).toBeUndefined(); expect(lifecycle.confirmation()).toBeUndefined();
  });

  it('confirms discards, resets reopening, and prevents selection changes and duplicate writes while saving', async () => {
    const { fixture, lifecycle, choose, button, accountActions } = await setup();
    choose('Account Report'); lifecycle.requestClose(); expect(lifecycle.confirmation()).toBe('discard');
    lifecycle.cancelConfirmation(); expect(lifecycle.form.controls.scope.value).toBe('account');
    lifecycle.discardEditor(); lifecycle.openCreate(); fixture.detectChanges();
    expect(lifecycle.form.controls.scope.value).toBeNull(); expect(lifecycle.form.controls.type.value).toBeNull();
    choose('Account Report'); choose('Data OverviewPreview pending');
    let reject!: (reason: Error) => void;
    accountActions.create.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    const save = lifecycle.submit(); fixture.detectChanges(); expect(button('Creating…').disabled).toBe(true);
    lifecycle.editSelection('scope'); lifecycle.selectScope('facility'); lifecycle.selectType('analysis'); lifecycle.requestClose(); await lifecycle.submit();
    expect(lifecycle.step()).toBe('name'); expect(lifecycle.form.controls.scope.value).toBe('account'); expect(lifecycle.editor()).toBeDefined(); expect(accountActions.create).toHaveBeenCalledTimes(1);
    reject(new Error('Save failed')); await save; fixture.detectChanges();
    expect(lifecycle.error()).toBe('Save failed'); expect(lifecycle.form.controls.name.value).toBe('Data Overview report');
    expect(lifecycle.canSave()).toBe(true); await lifecycle.submit(); expect(accountActions.create).toHaveBeenCalledTimes(2);
  });
});
