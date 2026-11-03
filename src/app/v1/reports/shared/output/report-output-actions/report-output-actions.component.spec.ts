import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReportsSharedModule } from '../../reports-shared.module';
import { ReportOutputCapability, ReportOutputState } from '../report-output.models';
import { ReportOutputActionsComponent } from './report-output-actions.component';

describe('report output actions', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders only supported formats, emits typed requests, and exposes busy cancellation', () => {
    const available = signal(true), busy = signal(false), state = signal<ReportOutputState>({ phase: 'idle', message: '' });
    const capability: ReportOutputCapability = { formats: ['pdf', 'xlsx'], available, busy,
      unavailableReason: signal(''), state, generate: vi.fn(), cancel: vi.fn() };
    TestBed.configureTestingModule({ imports: [ReportsSharedModule] });
    const fixture = TestBed.createComponent(ReportOutputActionsComponent);
    fixture.componentRef.setInput('capability', capability); fixture.detectChanges();
    const requested = vi.fn(), cancelled = vi.fn();
    fixture.componentInstance.requested.subscribe(requested); fixture.componentInstance.cancelled.subscribe(cancelled);
    const root: HTMLElement = fixture.nativeElement;
    expect(Array.from(root.querySelectorAll('button')).map(button => button.textContent?.trim())).toEqual(['PDF', 'Excel']);
    root.querySelector('button')!.click(); expect(requested).toHaveBeenCalledWith('pdf');
    available.set(false); busy.set(true); state.set({ phase: 'building', message: 'Rendering charts…', completed: 1, total: 3 }); fixture.detectChanges();
    const buttons = root.querySelectorAll('button');
    expect(buttons[0].disabled).toBe(true); expect(buttons[1].disabled).toBe(true); expect(buttons[2].disabled).toBe(false);
    buttons[2].click(); expect(cancelled).toHaveBeenCalledOnce();
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('p')).toBeNull();
    state.set({ phase: 'error', message: 'A required chart could not be rendered. Try again.' }); fixture.detectChanges();
    expect(root.querySelector('[role="alert"], [role="status"]')).toBeNull();
  });
});
