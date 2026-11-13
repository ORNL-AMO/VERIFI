import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { visualizationSnapshot } from '../../testing/visualization-test-fixtures';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { visualizationEvidenceFixture } from '@domain/visualizations/testing/visualization-provider-fixtures';
import { VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { PreviewModule } from '../preview.module';
import { PreviewIdentity, VISUALIZATION_DATE_CONTEXT_RESOLVER, VISUALIZATION_PREVIEW_PRESENTERS, VISUALIZATION_SOURCE_PROVIDERS } from '../preview-registry';
import { PreviewComponent } from './preview.component';

@Component({ selector: 'app-browser-preview-fixture', template: '<p>{{ label }}</p>' })
class BrowserPresenterFixture { @Input() label = ''; }

const identity: PreviewIdentity = { accountGuid: 'account-a', definitionGuid: 'visualization-a', definitionRevision: 1, workspaceRevision: 1 };
async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }

function setup(resolveOverride?: (request: VisualizationSourceRequest, signal: AbortSignal) => Promise<VisualizationSourceResolution>) {
  const definition = utilityVisualizationFixture(), evidence = visualizationEvidenceFixture(definition);
  const resolve = resolveOverride ?? (async request => ({ ...evidence.resolution, identity: request.identity }));
  const store = new AccountWorkspaceStore(); store.publish(visualizationSnapshot());
  TestBed.configureTestingModule({ imports: [PreviewModule, BrowserPresenterFixture], providers: [
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: VISUALIZATION_SOURCE_PROVIDERS, useValue: [{ kind: 'utility', describe: () => evidence.capabilities,
      supportsChart: () => evidence.chartSupport, resolve }] },
    { provide: VISUALIZATION_PREVIEW_PRESENTERS, useValue: [{ kind: 'time-series', component: BrowserPresenterFixture,
      prepare: () => ({ inputs: { label: 'Current monthly energy chart' }, details: {
        caption: 'Measured energy in kWh', columns: ['Period', 'Energy'], rows: [['January 2025', '0']] } }) }] },
    { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: { resolve: async () => ({ calendarDate: '2026-11-11', latestDataDate: '2025-12-31' }) } }
  ] });
  const fixture = TestBed.createComponent(PreviewComponent);
  fixture.componentRef.setInput('definition', definition); fixture.componentRef.setInput('identity', identity); fixture.detectChanges();
  return { fixture, definition, evidence, root: fixture.nativeElement as HTMLElement };
}

describe('visualization preview in Chromium', () => {
  it('mounts a clean chart with true zero values available to assistive technology', async () => {
    const { fixture, root } = setup(); await settle(); fixture.detectChanges();
    expect(root.querySelector('app-browser-preview-fixture')?.textContent).toContain('Current monthly energy chart');
    expect(root.querySelector('summary, details, app-pagination, h2, button')).toBeNull();
    const accessibleData = root.querySelector<HTMLElement>('.visually-hidden')!;
    expect(accessibleData.querySelector('table')).not.toBeNull();
    expect(accessibleData.hasAttribute('aria-hidden')).toBe(false);
    expect(accessibleData.getBoundingClientRect().height).toBeLessThanOrEqual(1);
    expect(root.querySelector('caption')!.textContent).toBe('Measured energy in kWh');
    expect(root.querySelector('tbody')!.textContent).toContain('January 20250');
    expect(root.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    root.style.width = '280px';
    for (const theme of ['v1-root', 'v1-root v1-theme-dark', 'v1-root v1-theme-dark v1-contrast-strong']) {
      root.className = theme; fixture.detectChanges();
      expect(root.querySelector<HTMLElement>('.visualization-preview')!.scrollWidth).toBeLessThanOrEqual(281);
    }
    fixture.destroy();
  });

  it('retries a failed provider through the keyboard and replaces the error with current values', async () => {
    let calls = 0;
    const evidence = visualizationEvidenceFixture(utilityVisualizationFixture());
    const { fixture, root } = setup(async request => ++calls === 1
      ? { state: 'error', identity: request.identity, message: 'Calculation failed.' }
      : { ...evidence.resolution, identity: request.identity });
    await settle(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    const retry = root.querySelector<HTMLButtonElement>('button')!;
    retry.focus(); await userEvent.keyboard('{Enter}'); await settle(); fixture.detectChanges();
    expect(calls).toBe(2); expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector('app-browser-preview-fixture')).not.toBeNull(); fixture.destroy();
  });

  it('aborts inactive previews and rejects their late responses without mounting a presenter', async () => {
    let complete!: (value: VisualizationSourceResolution) => void;
    const pending = new Promise<VisualizationSourceResolution>(resolve => { complete = resolve; });
    let request!: VisualizationSourceRequest; let abort!: AbortSignal;
    const { fixture, root, evidence } = setup((submitted, signal) => { request = submitted; abort = signal; return pending; });
    await settle(); expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();
    fixture.componentRef.setInput('active', false); fixture.detectChanges();
    complete({ ...evidence.resolution, identity: request.identity }); await settle(); fixture.detectChanges();
    expect(abort.aborted).toBe(true); expect(root.textContent).toContain('Chart is inactive.');
    expect(root.querySelector('app-browser-preview-fixture')).toBeNull(); expect(root.querySelector('table')).toBeNull(); fixture.destroy();
  });
});
