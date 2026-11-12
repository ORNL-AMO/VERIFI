import { TestBed } from '@angular/core/testing';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { LibraryModule } from '../../library/library.module';
import { LibraryLifecycle } from '../../library/lifecycle/library-lifecycle.service';
import { buildVisualizationLibrary } from '../../library/visualization-library.models';
import { configureLibraryTest, libraryRecord } from '../../library/testing/library-testing';
import { CreationComponent } from './creation-drawer.component';

describe('visualization creation drawer', () => {
  it.each(['Energy usage trend', 'Utility cost trend'])('distinguishes same-named portfolio meters by facility when binding %s', async recipe => {
    const { commands, workspace } = configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    const snapshot = workspace.snapshot()!;
    workspace.publish({ ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'facility-b', name: 'Facility B' }],
      meters: [meter({ name: 'Main' }), meter({ guid: 'meter-b', facilityId: 'facility-b', name: 'Main', noLongerInUse: true })],
      meterData: [reading({}), reading({ guid: 'bill-b', meterId: 'meter-b', facilityId: 'facility-b' })] });
    const fixture = TestBed.createComponent(CreationComponent), lifecycle = TestBed.inject(LibraryLifecycle);
    try {
      lifecycle.openCreate(); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(item =>
        item.querySelector('strong')?.textContent?.trim() === label || item.textContent?.trim() === label)!;
      button('Portfolio').click(); fixture.detectChanges(); button(recipe).click(); fixture.detectChanges();
      const select = root.querySelector<HTMLSelectElement>('#visualization-recipe-meters')!;
      expect([...select.options].map(option => ({ guid: option.value, label: option.textContent }))).toEqual([
        { guid: 'meter-a', label: 'Facility A / Main · Electricity' }, { guid: 'meter-b', label: 'Facility B / Main · Electricity · Retired' }
      ]);
      select.options[1].selected = true; select.dispatchEvent(new Event('change')); fixture.detectChanges();
      button('Continue').click(); fixture.detectChanges(); button('Add visualization').click(); await fixture.whenStable();
      expect(commands.prepareCreate).toHaveBeenCalledOnce();
      expect(commands.prepareCreate.mock.calls[0][0].sources[0]).toMatchObject({ selection: { kind: 'fixed', resource: 'meter', guids: ['meter-b'] } });
    } finally { fixture.destroy(); }
  });
  it('steps through chart and multiple families before requiring a name', async () => {
    const { commands } = configureLibraryTest([LibraryModule]); await TestBed.compileComponents();
    const fixture = TestBed.createComponent(CreationComponent); const lifecycle = TestBed.inject(LibraryLifecycle); lifecycle.openCreate(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent!.trim() === label)!;
    expect(root.querySelector('input[formcontrolname="name"]')).toBeNull(); button('Portfolio').click(); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('div[aria-label="Chart type"]')!.children).toHaveLength(11);
    [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Chart type"] button')].find(item => item.querySelector('strong')?.textContent === 'Scatter')!.click(); fixture.detectChanges();
    const families = root.querySelector('[aria-label="Source families"]')!; expect(families.children).toHaveLength(6);
    expect(button('Continue').disabled).toBe(true); button('Utility').click(); button('Weather').click(); fixture.detectChanges();
    expect(button('Utility').getAttribute('aria-pressed')).toBe('true'); expect(button('Weather').getAttribute('aria-pressed')).toBe('true');
    expect(lifecycle.step()).toBe('families'); expect(button('Continue').disabled).toBe(false);
    button('Continue').click(); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('label[for="visualization-name"]')).not.toBeNull(); await lifecycle.submit(); fixture.detectChanges();
    expect(root.textContent).toContain('Enter a visualization name.'); expect(commands.submit).not.toHaveBeenCalled();
    lifecycle.form.controls.name.setValue('Weather and usage'); fixture.detectChanges(); button('Add visualization').click(); await fixture.whenStable();
    expect(commands.prepareCreate.mock.calls[0][0]).toMatchObject({ chart: { kind: 'scatter', showFit: false }, sources: [{ kind: 'utility' }, { kind: 'weather' }] });
    fixture.destroy();
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
