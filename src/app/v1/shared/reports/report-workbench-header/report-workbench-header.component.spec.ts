import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { ReportWorkbenchEditor } from '../report-autosave-controller';
import { ReportsModule } from '../reports.module';
import { ReportWorkbenchHeaderComponent } from './report-workbench-header.component';

describe('shared report workbench header', () => {
  it('opens discard confirmation through the modal portal, pauses autosave, and discards only on confirmation', () => {
    const editor: ReportWorkbenchEditor = { state: signal('dirty'), error: signal(undefined), saving: signal(false), isDirty: signal(true),
      retry: vi.fn(), discard: vi.fn(), pauseAutosave: vi.fn(), resumeAutosave: vi.fn() };
    TestBed.configureTestingModule({ imports: [ReportsModule], providers: [provideRouter([]),
      { provide: WorkbenchLayoutService, useValue: { factsExpanded: signal(true), toggleFacts: vi.fn() } }] });
    const fixture = TestBed.createComponent(ReportWorkbenchHeaderComponent);
    for (const [key, value] of Object.entries({ editor, breadcrumbs: [{ label: 'Reports' }, { label: 'Saved report' }], resources: [{ id: 'report', label: 'Saved report', icon: 'report' }],
      selectedId: 'report', name: 'Saved report', typeLabel: 'Analysis', status: 'ready', statusLabel: 'Setup ready', facts: [], stages: [] })) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    const modal = TestBed.inject(ModalPortalService); const header = fixture.componentInstance;
    header.requestDiscard(); expect(modal.activePortal()).toBeTruthy(); expect(editor.pauseAutosave).toHaveBeenCalledOnce(); expect(editor.discard).not.toHaveBeenCalled();
    header.closeDiscard(); expect(editor.resumeAutosave).toHaveBeenCalledOnce(); expect(editor.discard).not.toHaveBeenCalled();
    header.requestDiscard(); header.closeDiscard(true); expect(editor.discard).toHaveBeenCalledOnce(); expect(modal.activePortal()).toBeNull();
  });
});
