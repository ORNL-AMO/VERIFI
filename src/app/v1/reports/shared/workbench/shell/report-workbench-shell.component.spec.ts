import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReportsSharedModule } from '../../reports-shared.module';
import { ReportWorkbenchController } from '../report-workbench.controller';
import { ReportWorkbenchHeaderComponent } from '../report-workbench-header/report-workbench-header.component';
import { ReportStageId } from '../report-workbench.models';
import { ReportOutputCapability } from '../../output/report-output.models';
import { ReportPresentationCapability } from '../../presentation/report-presentation-controller';
import { ReportWorkbenchShellComponent } from './report-workbench-shell.component';

describe('report presentation footer action', () => {
  it('shows an enabled Present action after exports only for a ready report with presentation support', () => {
    const presentation = { available: signal(false), present: vi.fn() } satisfies ReportPresentationCapability;
    const output: ReportOutputCapability = { formats: ['pdf', 'pptx'], available: signal(true), busy: signal(false), unavailableReason: signal(''),
      state: signal({ phase: 'idle', message: '' }), generate: vi.fn(), cancel: vi.fn() };
    const runtime = signal({ editor: {}, output, presentation: presentation as ReportPresentationCapability | undefined });
    const stage = signal<ReportStageId>('report');
    const workbench = { host: { stage, state: () => 'ready', returnLink: () => ({ route: ['/reports'] }), presentation: () => ({
      breadcrumbs: [], breadcrumbLabel: 'Reports', resources: [], selectedId: 'analysis', name: 'Analysis', typeLabel: 'Analysis',
      titleId: 'analysis-heading', status: 'ready', statusLabel: 'Ready', facts: [] }) },
      session: () => ({ runtime: runtime() }), previous: () => undefined, next: () => undefined, workflow: () => undefined, stages: () => [], beforeUnload: vi.fn() };
    TestBed.overrideComponent(ReportWorkbenchHeaderComponent, { set: { template: '' } });
    TestBed.configureTestingModule({ imports: [ReportsSharedModule], providers: [provideRouter([]), { provide: ReportWorkbenchController, useValue: workbench }] });
    const fixture = TestBed.createComponent(ReportWorkbenchShellComponent); fixture.detectChanges();
    const actions = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('footer button'));
    expect(actions().map(button => button.textContent?.trim())).toEqual(['PDF', 'PowerPoint']);
    presentation.available.set(true); fixture.detectChanges();
    expect(actions().map(button => button.textContent?.trim())).toEqual(['PDF', 'PowerPoint', 'Present']);
    expect(actions()[2].hasAttribute('disabled')).toBe(false);
    actions()[0].focus(); expect(document.activeElement).toBe(actions()[0]);
    let focusAtOpen: Element | null = null;
    presentation.present.mockImplementationOnce(() => { focusAtOpen = document.activeElement; });
    actions()[2].click(); expect(presentation.present).toHaveBeenCalledOnce();
    expect(focusAtOpen).toBe(actions()[2]);
    actions()[0].click(); expect(output.generate).toHaveBeenCalledWith('pdf');
    presentation.available.set(false); fixture.detectChanges();
    expect(actions().map(button => button.textContent?.trim())).toEqual(['PDF', 'PowerPoint']);
    presentation.available.set(true);
    for (const otherStage of ['setup', 'data-checks'] as const) {
      stage.set(otherStage); fixture.detectChanges(); expect(actions().map(button => button.textContent?.trim())).not.toContain('Present');
    }
    stage.set('report'); runtime.set({ ...runtime(), presentation: undefined }); fixture.detectChanges();
    expect(actions().map(button => button.textContent?.trim())).toEqual(['PDF', 'PowerPoint']);
  });
});
