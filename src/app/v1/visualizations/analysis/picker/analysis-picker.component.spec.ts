import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { accountAnalysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { AnalysisEditorsModule } from '../analysis-editors.module';
import { analysisPickerTestProvider } from '../../testing/analysis-picker.testing';
import { AnalysisPickerComponent } from './analysis-picker.component';

function setup() {
  const data = accountAnalysisFixture(), workspace = new AccountWorkspaceStore(); workspace.publish(data.snapshot);
  TestBed.configureTestingModule({ imports: [AnalysisEditorsModule], providers: [provideRouter([]), analysisPickerTestProvider(),
    { provide: AccountWorkspaceStore, useValue: workspace }] });
  const fixture = TestBed.createComponent(AnalysisPickerComponent), selected = vi.fn();
  fixture.componentRef.setInput('accountGuid', 'account-a');
  fixture.componentRef.setInput('scope', { kind: 'portfolio', facilityGuids: data.snapshot.facilities.map(item => item.guid) });
  fixture.componentRef.setInput('allFacilities', true);
  fixture.componentRef.setInput('selectedGuid', 'analysis-a');
  fixture.componentRef.setInput('resetKey', 'first'); fixture.componentRef.setInput('idPrefix', 'test-picker');
  fixture.componentInstance.selected.subscribe(selected); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const card = (name: string) => root.querySelector(`[aria-label="Inspect ${name}"]`)!.closest('.report-analysis-card')!;
  return { fixture, root, card, selected, workspace, data };
}

describe('shared visualization Analysis picker', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('proposes a selection without replacing the accepted radio state before host review', async () => {
    const { fixture, card, selected } = setup();
    expect(selected).not.toHaveBeenCalled();
    card('Second baseline').querySelector<HTMLInputElement>('input[type=radio]')!.click();
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(selected).toHaveBeenCalledExactlyOnceWith('analysis-b');
    expect(fixture.componentInstance.selectionControl.value).toBe('analysis-a');
    expect(card('Production baseline').querySelector<HTMLInputElement>('input[type=radio]')!.checked).toBe(true);
    expect(card('Second baseline').querySelector<HTMLInputElement>('input[type=radio]')!.checked).toBe(false);
    fixture.componentRef.setInput('selectedGuid', 'analysis-b'); fixture.detectChanges();
    expect(card('Second baseline').querySelector<HTMLInputElement>('input[type=radio]')!.checked).toBe(true);
    expect(selected).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true); fixture.detectChanges();
    fixture.componentInstance.selectionControl.setValue('account-analysis');
    expect(selected).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('inspects facility/account metadata and resets inspection and filters without result demand', () => {
    const { fixture, root, selected } = setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Inspect Portfolio baseline"]')!.click(); fixture.detectChanges();
    expect(root.querySelector('app-account-analysis-details-slideout')).not.toBeNull(); expect(selected).not.toHaveBeenCalled();
    fixture.componentRef.setInput('resetKey', 'second'); fixture.detectChanges();
    expect(root.querySelector('app-account-analysis-details-slideout')).toBeNull();
    const baseline = root.querySelector<HTMLSelectElement>('[formcontrolname=baselineYear]')!;
    baseline.selectedIndex = 1; baseline.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(root.textContent).toContain('Clear filters');
    fixture.componentRef.setInput('resetKey', 'third'); fixture.detectChanges();
    expect(root.textContent).not.toContain('Clear filters');
    root.querySelector<HTMLButtonElement>('[aria-label="Inspect Production baseline"]')!.click(); fixture.detectChanges();
    expect(root.querySelector('app-analysis-details-slideout')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('app-analysis-details-slideout .v1-workspace-slideout__footer button')!.click(); fixture.detectChanges();
    expect(root.querySelector('app-analysis-details-slideout')).toBeNull(); expect(selected).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('limits new choices to current account and inclusion without substituting a selected GUID', () => {
    const { fixture, root, workspace, data, selected } = setup();
    fixture.componentRef.setInput('selectedGuid', 'account-analysis');
    fixture.componentRef.setInput('allFacilities', false); fixture.detectChanges();
    expect(root.querySelector('[aria-label="Inspect Portfolio baseline"]')).toBeNull();
    expect(fixture.componentInstance.selectionControl.value).toBe('account-analysis');
    fixture.componentRef.setInput('scope', { kind: 'facility', facilityGuid: 'facility-a', facilityGuids: ['facility-a'] }); fixture.detectChanges();
    expect(root.querySelector('[aria-label="Inspect Second baseline"]')).toBeNull();
    expect(root.querySelector('[aria-label="Inspect Production baseline"]')).not.toBeNull();
    workspace.publishCommitted({ ...data.snapshot, account: { ...data.snapshot.account, guid: 'other-account' } }, {}); fixture.detectChanges();
    expect(fixture.componentInstance.cards()).toEqual([]); expect(selected).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectionControl.value).toBe('account-analysis');
    fixture.destroy();
  });
});
