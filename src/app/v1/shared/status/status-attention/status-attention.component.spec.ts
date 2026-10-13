import { TestBed } from '@angular/core/testing';
import { StatusAttentionComponent } from './status-attention.component';

describe('StatusAttentionComponent', () => {
  it('renders error precedence, contextual tooltip, and grammatical issue counts', () => {
    const fixture = TestBed.createComponent(StatusAttentionComponent);
    fixture.componentRef.setInput('contextLabel', 'Meter readings');
    fixture.componentRef.setInput('summary', { total: 2, errorCount: 1, warningCount: 1, state: 'error' });
    fixture.detectChanges();
    const badge: HTMLElement = fixture.nativeElement.querySelector('.v1-status-attention');
    expect(badge.classList).toContain('v1-badge--danger');
    expect(badge.title).toBe('Meter readings: 2 issues: 1 error, 1 warning');
    expect(badge.querySelector('[aria-hidden]')?.textContent).toBe('2');
    expect(badge.querySelector('.visually-hidden')?.textContent).toBe('2 issues: 1 error, 1 warning');

    fixture.componentRef.setInput('summary', { total: 1, errorCount: 0, warningCount: 1, state: 'warning' });
    fixture.componentRef.setInput('display', 'indicator');
    fixture.detectChanges();
    expect(badge.classList).toContain('v1-badge--warning');
    expect(badge.classList).not.toContain('v1-badge--danger');
    expect(badge.querySelector('[aria-hidden]')?.textContent).toBe('!');
    expect(badge.title).toContain('1 issue: 0 errors, 1 warning');

    fixture.componentRef.setInput('summary', { total: 0, errorCount: 0, warningCount: 0, state: 'valid' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-status-attention')).toBeNull();
  });
});
