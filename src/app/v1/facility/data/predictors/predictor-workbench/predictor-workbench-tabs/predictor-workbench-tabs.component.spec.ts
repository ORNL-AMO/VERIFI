import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PREDICTOR_WORKBENCH_TABS } from '../../models';
import { PredictorWorkbenchTabsComponent } from './predictor-workbench-tabs.component';

describe('PredictorWorkbenchTabsComponent', () => {
  it('renders connected tabs, marks the active tab, and emits selection', () => {
    TestBed.configureTestingModule({ imports: [PredictorWorkbenchTabsComponent] });
    const fixture = TestBed.createComponent(PredictorWorkbenchTabsComponent);
    fixture.componentRef.setInput('tabs', PREDICTOR_WORKBENCH_TABS);
    fixture.componentRef.setInput('activeTab', 'readings');
    fixture.componentRef.setInput('attention', {
      readings: { total: 2, errorCount: 1, warningCount: 1, state: 'error' }
    });
    const selected = vi.fn();
    fixture.componentInstance.tabSelected.subscribe(selected);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.v1-data-tabs__tab')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent).toContain('Readings');
    expect(fixture.nativeElement.textContent).toContain('2 issues: 1 errors, 1 warnings');
    (fixture.nativeElement.querySelectorAll('button')[2] as HTMLButtonElement).click();
    expect(selected).toHaveBeenCalledWith('quality');
  });
});
