import { TestBed } from '@angular/core/testing';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFinding } from '@app/v1/status/status.catalog';
import { StatusFindingActionComponent } from './status-finding-action.component';

describe('status finding action', () => {
  it('names available actions for keyboard and screen-reader users and shows explicit pending text without an action', () => {
    const navigateTo = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: WorkspaceStatusService, useValue: { navigateTo } }] });
    const fixture = TestBed.createComponent(StatusFindingActionComponent);
    const item = { ...presentFinding(makeFinding('report.configuration.invalid', 'error', 'configuration', {
      kind: 'account-report', guid: 'report-a', accountGuid: 'account-a', name: 'Annual report'
    })), destination: { kind: 'account-report-setup' as const, accountGuid: 'account-a', reportGuid: 'report-a' }, actionLabel: 'Review name' };
    fixture.componentRef.setInput('item', item); fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button'); expect(button.getAttribute('aria-label')).toBe('Review name for Annual report');
    button.click(); expect(navigateTo).toHaveBeenCalledExactlyOnceWith(item);
    fixture.componentRef.setInput('item', { ...item, destination: { kind: 'unavailable' }, unavailableReason: 'Report date settings are pending migration.' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull(); expect(fixture.nativeElement.textContent).toContain('Report date settings are pending migration.');
  });
});
