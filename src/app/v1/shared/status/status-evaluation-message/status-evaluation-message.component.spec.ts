import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StatusEvaluationMessageComponent } from './status-evaluation-message.component';

describe('StatusEvaluationMessageComponent', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });
  it('announces checking and failure without reporting unavailable checks as valid', () => {
    const fixture = TestBed.createComponent(StatusEvaluationMessageComponent);
    for (const state of ['idle', 'evaluating', 'error', 'ready']) {
      fixture.componentRef.setInput('state', state);
      fixture.detectChanges();
      const message: HTMLElement | null = fixture.nativeElement.querySelector('.v1-alert');
      if (state === 'ready') expect(message).toBeNull();
      else if (state === 'error') {
        expect(message?.getAttribute('role')).toBe('alert');
        expect(message?.textContent).toContain('Workspace status could not be evaluated.');
      } else {
        expect(message?.getAttribute('role')).toBe('status');
        expect(message?.textContent).toContain('Checking workspace data...');
      }
    }
  });

  it('keeps brief sidebar checks quiet and shows checks that remain pending', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(StatusEvaluationMessageComponent);
    fixture.componentRef.setInput('compact', true);
    fixture.componentRef.setInput('state', 'ready'); fixture.detectChanges();
    const slot = fixture.nativeElement.querySelector('.compact-status');
    fixture.componentRef.setInput('state', 'evaluating'); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(299); fixture.detectChanges();
    expect(slot.textContent.trim()).toBe('');
    fixture.componentRef.setInput('state', 'ready'); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000); fixture.detectChanges();
    expect(slot.textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('.compact-status')).toBe(slot);

    fixture.componentRef.setInput('state', 'evaluating'); fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300); fixture.detectChanges();
    expect(slot.textContent).toContain('Checking data…');
    fixture.componentRef.setInput('state', 'ready'); fixture.detectChanges();
    expect(slot.textContent.trim()).toBe('');
  });

  it('shows sidebar errors immediately and cancels delayed feedback on destruction', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(StatusEvaluationMessageComponent);
    fixture.componentRef.setInput('compact', true);
    fixture.componentRef.setInput('state', 'evaluating'); fixture.detectChanges();
    fixture.componentRef.setInput('state', 'error'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Workspace status could not be evaluated.');
    fixture.componentRef.setInput('state', 'evaluating'); fixture.detectChanges();
    fixture.destroy(); await vi.advanceTimersByTimeAsync(1000);
    expect(fixture.componentInstance.showChecking()).toBe(false);
  });
});
