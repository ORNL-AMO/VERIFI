import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ReportsModule } from '../reports.module';
import { AnalysisChecksWorkflow } from '../analysis-checks.models';
import { AnalysisChecksAcknowledgmentComponent } from './analysis-checks-acknowledgment.component';

describe('shared analysis acknowledgment', () => {
  afterEach(() => TestBed.resetTestingModule());
  async function setup() {
    await TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(AnalysisChecksAcknowledgmentComponent);
    const state: AnalysisChecksWorkflow = { key: 'checks', completed: false, canConfirm: true, blocked: false, saving: false };
    const update = (changes: Partial<AnalysisChecksWorkflow>) => {
      Object.assign(state, changes); fixture.componentRef.setInput('workflow', { ...state }); fixture.detectChanges();
    };
    update({}); return { fixture, update };
  }
  it('emits only explicit acknowledgment and disables duplicate interaction during saving', async () => {
    const { fixture, update } = await setup(); const acknowledged = vi.fn(); fixture.componentInstance.acknowledged.subscribe(acknowledged);
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(acknowledged).not.toHaveBeenCalled(); checkbox.click(); expect(acknowledged).toHaveBeenCalledOnce();
    update({ saving: true, canConfirm: false, message: 'Saving your review…' });
    expect(checkbox.disabled).toBe(true); expect(checkbox.checked).toBe(true); checkbox.click(); expect(acknowledged).toHaveBeenCalledOnce();
    update({ saving: false, canConfirm: true, error: 'Disk full' });
    expect(checkbox.disabled).toBe(false); expect(checkbox.checked).toBe(false); expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Disk full');
    checkbox.click(); expect(acknowledged).toHaveBeenCalledTimes(2);
  });
  it('replaces acknowledgment with completion and preserves keyboard focus', async () => {
    const { fixture, update } = await setup();
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    checkbox.focus(); checkbox.click(); update({ completed: true, canConfirm: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    const completed = fixture.nativeElement.querySelector('[role="status"]');
    expect(completed.textContent).toContain('Data Checks Completed'); expect(document.activeElement).toBe(completed);
  });
  it('blocks acknowledgment for critical or pending checks without emitting on hydration', async () => {
    const { fixture, update } = await setup(); const acknowledged = vi.fn(); fixture.componentInstance.acknowledged.subscribe(acknowledged);
    update({ blocked: true, canConfirm: false, message: 'Resolve critical issues before continuing.' });
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement; checkbox.click();
    expect(checkbox.disabled).toBe(true); expect(acknowledged).not.toHaveBeenCalled();
    update({ completed: true }); expect(acknowledged).not.toHaveBeenCalled();
  });
});
