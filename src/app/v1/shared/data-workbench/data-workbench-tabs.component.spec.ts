import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataWorkbenchTabsComponent } from './data-workbench-tabs.component';

describe('DataWorkbenchTabsComponent', () => {
  it('renders connected tabs, active state, attention, and emits the selected identifier', () => {
    TestBed.configureTestingModule({ imports: [DataWorkbenchTabsComponent] });
    const fixture = TestBed.createComponent(DataWorkbenchTabsComponent);
    fixture.componentRef.setInput('tabs', [
      { id: 'settings', label: 'Settings', icon: 'settings' },
      { id: 'readings', label: 'Readings', icon: 'table' }
    ]);
    fixture.componentRef.setInput('activeTab', 'readings');
    fixture.componentRef.setInput('ariaLabel', 'Data sections');
    fixture.componentRef.setInput('attention', {
      readings: { total: 2, errorCount: 1, warningCount: 1, state: 'error' }
    });
    const selected = vi.fn();
    fixture.componentInstance.tabSelected.subscribe(selected);
    fixture.detectChanges();

    const navigation = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(navigation.classList).toContain('v1-data-tabs--connected');
    expect(navigation.getAttribute('aria-label')).toBe('Data sections');
    expect(buttons[1].getAttribute('aria-current')).toBe('page');
    expect(buttons[1].textContent).toContain('2');

    buttons[0].click();
    expect(selected).toHaveBeenCalledWith('settings');
  });

  it('can render attention as an action-needed indicator without exposing the count visually', () => {
    TestBed.configureTestingModule({ imports: [DataWorkbenchTabsComponent] });
    const fixture = TestBed.createComponent(DataWorkbenchTabsComponent);
    fixture.componentRef.setInput('tabs', [{ id: 'regression', label: 'Regression', icon: 'analysis' }]);
    fixture.componentRef.setInput('activeTab', 'regression');
    fixture.componentRef.setInput('ariaLabel', 'Analysis sections');
    fixture.componentRef.setInput('attentionDisplay', 'indicator');
    fixture.componentRef.setInput('level', 'secondary');
    fixture.componentRef.setInput('attention', {
      regression: { total: 2, errorCount: 1, warningCount: 1, state: 'error' }
    });
    fixture.detectChanges();

    const indicator = fixture.nativeElement.querySelector('.v1-data-tabs__attention') as HTMLElement;
    expect(fixture.nativeElement.querySelector('nav').classList).toContain('v1-data-tabs--secondary');
    expect(indicator.textContent).toContain('!');
    expect(indicator.textContent).toContain('2 issues');
  });

  it('renders unavailable tabs as disabled and does not emit their identifier', () => {
    TestBed.configureTestingModule({ imports: [DataWorkbenchTabsComponent] });
    const fixture = TestBed.createComponent(DataWorkbenchTabsComponent);
    fixture.componentRef.setInput('tabs', [{
      id: 'banking', label: 'Banked Savings', icon: 'bank', disabled: true,
      disabledReason: 'Complete valid banking options in Setup to view Banked Savings.'
    }]);
    fixture.componentRef.setInput('activeTab', 'setup');
    fixture.componentRef.setInput('ariaLabel', 'Analysis sections');
    const selected = vi.fn();
    fixture.componentInstance.tabSelected.subscribe(selected);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.title).toContain('Complete valid banking options');
    expect(button.tabIndex).toBe(0);
    const descriptionId = button.getAttribute('aria-describedby');
    expect(descriptionId).toBeTruthy();
    expect(fixture.nativeElement.querySelector(`#${descriptionId}`)?.textContent)
      .toContain('Complete valid banking options');
    button.focus();
    expect(document.activeElement).toBe(button);
    button.click();
    expect(selected).not.toHaveBeenCalled();
  });
});
