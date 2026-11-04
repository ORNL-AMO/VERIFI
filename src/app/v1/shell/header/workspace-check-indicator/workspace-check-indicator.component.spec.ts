import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShellHeaderTestModule } from '../shell-header.testing';
import { WorkspaceCheckIndicatorComponent } from './workspace-check-indicator.component';
import type { StatusEvaluationState } from '@app/v1/status/status.models';

describe('WorkspaceCheckIndicatorComponent', () => {
  let fixture: ComponentFixture<WorkspaceCheckIndicatorComponent>;
  const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
  const state = (value: StatusEvaluationState) => {
    fixture.componentRef.setInput('state', value);
    fixture.detectChanges();
  };
  const advance = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [ShellHeaderTestModule] });
    fixture = TestBed.createComponent(WorkspaceCheckIndicatorComponent);
    fixture.componentRef.setInput('accountGuid', 'account-a');
    state('ready');
  });
  afterEach(() => { fixture.destroy(); vi.useRealTimers(); });

  it('keeps initialization and brief checks silent, showing continuous checks only at one second', async () => {
    state('idle'); await advance(2000); expect(button()).toBeNull();
    state('evaluating'); await advance(999); expect(button()).toBeNull();
    state('ready'); await advance(1000); expect(button()).toBeNull();
    state('evaluating'); await advance(999); expect(button()).toBeNull();
    await advance(1);
    expect(button()?.getAttribute('aria-label')).toBe('Updating data checks. Open To-dos');
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toBe('Updating data checks.');
    state('ready'); expect(button()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toBe('');
  });

  it('shows failures immediately and emits the same open action for failed and prolonged checks', async () => {
    const open = vi.fn(); fixture.componentInstance.openTodos.subscribe(open);
    state('evaluating'); await advance(500); state('error');
    expect(button()?.getAttribute('aria-label')).toBe('Data checks unavailable. Open To-dos');
    button()!.click(); expect(open).toHaveBeenCalledTimes(1);
    await advance(1000);
    expect(button()?.getAttribute('aria-label')).toContain('unavailable');
    state('evaluating'); expect(button()).toBeNull(); await advance(1000);
    button()!.click(); expect(open).toHaveBeenCalledTimes(2);
    state('ready'); expect(button()).toBeNull();
  });

  it('restarts the delay for a different account and cancels pending work on destruction', async () => {
    state('evaluating'); await advance(700);
    fixture.componentRef.setInput('accountGuid', 'account-b'); fixture.detectChanges();
    await advance(999); expect(button()).toBeNull(); await advance(1); expect(button()).not.toBeNull();
    fixture.componentRef.setInput('accountGuid', 'account-c'); fixture.detectChanges(); expect(button()).toBeNull();
    fixture.destroy(); await vi.advanceTimersByTimeAsync(2000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('provides focus and hover descriptions and suppresses duplicate announcements when To-dos is visible', () => {
    state('error'); const control = button()!;
    const tooltip = () => fixture.nativeElement.querySelector('[role=tooltip]') as HTMLElement;
    expect(tooltip().hidden).toBe(true);
    control.dispatchEvent(new Event('focus')); fixture.detectChanges(); expect(tooltip().hidden).toBe(false);
    expect(control.getAttribute('aria-describedby')).toBe(tooltip().id);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges(); expect(tooltip().hidden).toBe(true);
    control.dispatchEvent(new Event('mouseenter')); fixture.detectChanges(); expect(tooltip().hidden).toBe(false);
    control.dispatchEvent(new Event('mouseleave')); fixture.detectChanges(); expect(tooltip().hidden).toBe(true);
    fixture.componentRef.setInput('announce', false); fixture.detectChanges();
    expect(button()).not.toBeNull(); expect(fixture.nativeElement.querySelector('[role=status]').textContent).toBe('');
  });
});
