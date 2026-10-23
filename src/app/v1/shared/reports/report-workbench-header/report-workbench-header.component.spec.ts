import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { ReportAutosaveState, ReportWorkbenchEditor } from '../report-autosave-controller';
import { ReportsModule } from '../reports.module';
import { ReportWorkbenchHeaderComponent } from './report-workbench-header.component';

describe('shared report workbench header', () => {
  function setup() {
    const editor = { state: signal<ReportAutosaveState>('dirty'), error: signal<string | undefined>(undefined), saving: signal(false), isDirty: signal(true),
      retry: vi.fn(), discard: vi.fn(), pauseAutosave: vi.fn(), resumeAutosave: vi.fn() } satisfies ReportWorkbenchEditor;
    TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([]),
      { provide: WorkbenchLayoutService, useValue: { factsExpanded: signal(true), toggleFacts: vi.fn() } }] });
    const fixture = TestBed.createComponent(ReportWorkbenchHeaderComponent);
    for (const [key, value] of Object.entries({ editor, breadcrumbs: [{ label: 'Reports' }, { label: 'Saved report' }], resources: [{ id: 'report', label: 'Saved report', icon: 'report' }],
      selectedId: 'report', name: 'Saved report', typeLabel: 'Analysis', status: 'ready', statusLabel: 'Setup ready', facts: [], stages: [] })) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    return { fixture, editor };
  }
  it('uses the existing inline indicator through edits and saves, reserving alerts for validation and save failures', () => {
    const { fixture, editor } = setup();
    const root = fixture.nativeElement as HTMLElement;
    const indicator = root.querySelector('.report-save-state');
    expect(indicator?.textContent).toContain('Saving');
    expect(root.querySelector('.v1-alert')).toBeNull();
    editor.state.set('saving'); editor.saving.set(true); fixture.detectChanges();
    expect(root.querySelector('.report-save-state')).toBe(indicator);
    expect(root.querySelector('.v1-alert')).toBeNull();
    editor.state.set('saved'); editor.saving.set(false); editor.isDirty.set(false); fixture.detectChanges();
    expect(indicator?.textContent).toContain('Saved');
    expect(root.querySelector('.v1-alert')).toBeNull();
    editor.state.set('invalid'); editor.isDirty.set(true); fixture.detectChanges();
    expect(root.querySelector('.v1-alert')?.textContent).toContain('Correct invalid fields');
    editor.state.set('error'); editor.error.set('Disk full'); fixture.detectChanges();
    expect(root.querySelector('.v1-alert')?.textContent).toContain('Disk full');
    const retry = [...root.querySelectorAll<HTMLButtonElement>('.v1-alert button')].find(button => button.textContent?.trim() === 'Retry')!;
    retry.click(); expect(editor.retry).toHaveBeenCalledOnce();
  });
  it('opens discard confirmation through the modal portal, pauses autosave, and discards only on confirmation', () => {
    const { fixture, editor } = setup();
    const modal = TestBed.inject(ModalPortalService); const header = fixture.componentInstance;
    header.requestDiscard(); expect(modal.activePortal()).toBeTruthy(); expect(editor.pauseAutosave).toHaveBeenCalledOnce(); expect(editor.discard).not.toHaveBeenCalled();
    header.closeDiscard(); expect(editor.resumeAutosave).toHaveBeenCalledOnce(); expect(editor.discard).not.toHaveBeenCalled();
    header.requestDiscard(); header.closeDiscard(true); expect(editor.discard).toHaveBeenCalledOnce(); expect(modal.activePortal()).toBeNull();
  });
});
