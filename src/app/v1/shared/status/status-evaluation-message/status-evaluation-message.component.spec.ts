import { TestBed } from '@angular/core/testing';
import { StatusEvaluationMessageComponent } from './status-evaluation-message.component';

describe('StatusEvaluationMessageComponent', () => {
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
});
