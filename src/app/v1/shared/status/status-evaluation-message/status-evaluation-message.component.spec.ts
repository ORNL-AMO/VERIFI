import { TestBed } from '@angular/core/testing';
import { StatusEvaluationMessageComponent } from './status-evaluation-message.component';

describe('StatusEvaluationMessageComponent', () => {
  it('distinguishes loading, checking and unavailable checks without reporting them as valid', () => {
    const fixture = TestBed.createComponent(StatusEvaluationMessageComponent);
    for (const [state, message, role] of [
      ['idle', 'Loading workspace…', 'status'],
      ['evaluating', 'Updating data checks…', 'status'],
      ['error', 'Data checks are unavailable. Warnings and attention counts cannot currently be verified.', 'alert'],
      ['ready', '', '']
    ]) {
      fixture.componentRef.setInput('state', state); fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector('.v1-alert');
      if (state === 'ready') expect(alert).toBeNull();
      else {
        expect(alert?.textContent).toBe(message);
        expect(alert?.getAttribute('role')).toBe(role);
      }
    }
  });
});
