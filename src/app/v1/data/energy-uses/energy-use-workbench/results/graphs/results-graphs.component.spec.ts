import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../../energy-uses.module';
import { resultsEquipment, resultsTestContext } from '../energy-use-results.testing';
import { ResultsGraphsComponent } from './results-graphs.component';

describe('Energy Use chart tabs', () => {
  it('shows Sankey plus its source table in Group Footprint and chart-only equipment history in Group Summary', () => {
    const setup = resultsTestContext();
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(ResultsGraphsComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect((component.option().series as { type: string }[])[0].type).toBe('sankey');
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Group Footprint');
    expect(fixture.nativeElement.querySelector('h2').classList.contains('visually-hidden')).toBe(true);
    expect(fixture.nativeElement.querySelector('h3')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type=checkbox]')).toBeNull();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-energy-use-results-table')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-energy-use-footprint-table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.energy-use-footprint-table__total').textContent).toContain('150');
    expect(fixture.nativeElement.querySelector('.energy-use-results-graphs__accessible-data')).toBeNull();
    setup.context.activeTab.set('group-summary'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Group Summary');
    expect(fixture.nativeElement.querySelector('app-energy-use-footprint-table')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-energy-use-summary-table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect((component.option().series as { type: string }[])[0].type).toBe('bar');
    component.results.historyControl.setValue(true); fixture.detectChanges();
    expect(component.history()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('app-energy-use-summary-table thead th')).toHaveLength(13);
    setup.context.activeTab.set('group-footprint'); fixture.detectChanges();
    expect(component.history()).toBe(false);
    expect(component.results.history()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.energy-use-footprint-table__item')).toHaveLength(2);
  });

  it('retains every equipment value in the visible summary without pagination', () => {
    const setup = resultsTestContext(Array.from({ length: 30 }, (_, index) => resultsEquipment(`item-${index}`, 2024, 0)));
    setup.context.activeTab.set('group-summary');
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: setup.providers });
    const fixture = TestBed.createComponent(ResultsGraphsComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No positive consumption to chart');
    expect(fixture.nativeElement.querySelectorAll('app-energy-use-summary-table tbody tr')).toHaveLength(30);
    expect(fixture.nativeElement.querySelector('app-energy-use-summary-table tbody').textContent).toContain('Unavailable');
    expect(fixture.nativeElement.querySelector('app-energy-use-results-table')).toBeNull();
  });
});
