import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from '../../../../../shared/icons/icon.component';
import { METER_WORKBENCH_TABS } from '../../facility-meters.models';
import { MeterWorkbenchTabsComponent } from './meter-workbench-tabs.component';

describe('MeterWorkbenchTabsComponent', () => {
  it('marks the active workbench tab and emits selected tabs', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const emitted: string[] = [];
    component.tabSelected.subscribe(tabId => emitted.push(tabId));
    component.tabs = METER_WORKBENCH_TABS;
    component.activeTab = 'monthly';

    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const monthlyButton = buttons.find(button => button.textContent?.includes('Monthly Data'));
    expect(monthlyButton?.getAttribute('aria-current')).toBe('page');
    expect(METER_WORKBENCH_TABS.find(tab => tab.id === 'readings')?.icon).toBe('table');

    buttons.find(button => button.textContent?.includes('Quality Report'))?.click();

    expect(emitted).toEqual(['quality']);
  });
});

function setup(): ComponentFixture<MeterWorkbenchTabsComponent> {
  TestBed.configureTestingModule({
    declarations: [MeterWorkbenchTabsComponent],
    imports: [IconComponent]
  });

  return TestBed.createComponent(MeterWorkbenchTabsComponent);
}
