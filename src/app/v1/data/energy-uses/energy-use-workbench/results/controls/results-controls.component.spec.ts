import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../../energy-uses.module';
import { resultsEquipment, resultsTestContext } from '../energy-use-results.testing';
import { ResultsControlsComponent } from './results-controls.component';

describe('Energy Use results controls', () => {
  it('restores the session-only history preference per group without a year control', () => {
    const setup = resultsTestContext([resultsEquipment(), resultsEquipment('newer', 2025), { ...resultsEquipment('other', 2024), energyUseGroupId: 'other' }]);
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(ResultsControlsComponent); fixture.detectChanges();
    const results = fixture.componentInstance.results;
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    results.historyControl.setValue(true); fixture.detectChanges();
    expect(results.history()).toBe(true);
    setup.groupGuid.set('other'); fixture.detectChanges();
    expect(results.years()).toEqual([2024]); expect(results.history()).toBe(false);
    setup.groupGuid.set('group-a'); fixture.detectChanges();
    expect(results.historyControl.value).toBe(true);
    expect(fixture.nativeElement.querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(results.history()).toBe(true);
  });
});
