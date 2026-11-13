import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { CreateVisualizationCommand, VisualizationCommandOutcome } from '@data/account-workspace/visualization-commands.models';
import type { SavedVisualizationReadResult } from '@data/visualizations/saved-visualization-record';

export interface UtilityCaptureSessionDependencies {
  readonly prepare: (definition: VisualizationDefinition) => CreateVisualizationCommand;
  readonly submit: (command: CreateVisualizationCommand) => Promise<VisualizationCommandOutcome>;
  readonly recover: (accountGuid: string, guid: string) => Promise<SavedVisualizationReadResult | undefined>;
  readonly open: (accountGuid: string, guid: string) => Promise<boolean>;
  readonly accountGuid: () => string | undefined;
  readonly ready: () => boolean;
  readonly registerProtection: (dirty: Signal<boolean>, saving: Signal<boolean>, refreshRequired: Signal<boolean>, discard: () => void, preventLeave: () => Promise<boolean>) => () => void;
}

/** One capture proposal owns one identity through write retries and publication recovery. */
export class UtilityCaptureSession {
  readonly proposal = signal<CreateVisualizationCommand | undefined>(undefined);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly refreshRequired = signal(false);
  readonly saved = signal<{ accountGuid: string; guid: string } | undefined>(undefined);
  readonly needsProtection = computed(() => !!this.proposal() || this.saving());
  readonly canDiscard = computed(() => !!this.proposal() && !this.saving() && !this.refreshRequired());
  private running?: Promise<void>;
  private unregister?: () => void;
  private destroyed = false;
  private dependencies?: UtilityCaptureSessionDependencies;

  constructor(private readonly resolveDependencies: () => UtilityCaptureSessionDependencies) { }

  start(definition: VisualizationDefinition): Promise<void> {
    if (this.destroyed || this.proposal() || this.saving() || this.saved()) return this.running ?? Promise.resolve();
    try {
      const dependencies = this.dependencies ??= this.resolveDependencies();
      if (!dependencies.ready() || dependencies.accountGuid() !== definition.accountGuid) { this.message.set('Wait for the ready owning account before capturing.'); return Promise.resolve(); }
      this.unregister ??= dependencies.registerProtection(this.needsProtection, this.saving, this.refreshRequired, () => this.discard(), () => this.resolveLeave());
      this.proposal.set(dependencies.prepare(definition)); this.message.set('');
      return this.retry();
    } catch (error) { this.message.set(message(error)); return Promise.resolve(); }
  }

  retry(): Promise<void> {
    if (this.running) return this.running;
    const proposal = this.proposal(), dependencies = this.dependencies;
    if (this.destroyed || !proposal || !dependencies) return Promise.resolve();
    if (!dependencies.ready() || dependencies.accountGuid() !== proposal.accountGuid) { this.message.set('Restore the ready owning account before retrying this retained capture.'); return Promise.resolve(); }
    this.saving.set(true); this.message.set('');
    this.running = this.execute(proposal, dependencies).catch(error => { if (!this.destroyed) this.message.set(message(error)); })
      .finally(() => { this.running = undefined; if (!this.destroyed) this.saving.set(false); });
    return this.running;
  }

  private async execute(proposal: CreateVisualizationCommand, dependencies: UtilityCaptureSessionDependencies): Promise<void> {
    if (this.refreshRequired()) {
      const recovered = await dependencies.recover(proposal.accountGuid, proposal.guid);
      if (this.destroyed) return;
      if (!recovered) throw new Error('The committed visualization could not be found. Keep this proposal and retry refresh; no creation will be replayed.');
      await this.complete(proposal, dependencies); return;
    }
    const result = await dependencies.submit(proposal);
    if (this.destroyed) return;
    if (result.state === 'committed') { await this.complete(proposal, dependencies); return; }
    this.refreshRequired.set(result.state === 'refresh-required');
    this.message.set(result.state === 'refresh-required'
      ? 'The visualization was saved, but the workspace could not refresh. Retry refresh to open that saved identity.'
      : result.state === 'conflict' ? 'This capture identity already changed. Discard the rejected proposal and capture again after reviewing the saved data.' : message(result.error));
  }

  private async complete(proposal: CreateVisualizationCommand, dependencies: UtilityCaptureSessionDependencies): Promise<void> {
    this.saved.set({ accountGuid: proposal.accountGuid, guid: proposal.guid });
    this.proposal.set(undefined); this.refreshRequired.set(false); this.saving.set(false);
    if (dependencies.accountGuid() !== proposal.accountGuid) { this.message.set('Saved in its owning account. Open it from that account’s Visualizations Dashboard.'); return; }
    await this.openSaved();
  }

  async openSaved(): Promise<void> {
    const saved = this.saved(), dependencies = this.dependencies;
    if (this.destroyed || !saved || !dependencies) return;
    try {
      const opened = dependencies.accountGuid() === saved.accountGuid && await dependencies.open(saved.accountGuid, saved.guid);
      if (this.destroyed) return;
      if (!opened) this.message.set('Saved successfully. Open the visualization from its owning Dashboard, or retry Open saved visualization.');
      else this.message.set('');
    } catch { if (!this.destroyed) this.message.set('Saved successfully, but the workbench could not be opened. Retry Open saved visualization.'); }
  }

  discard(): void {
    if (!this.canDiscard()) return;
    this.proposal.set(undefined); this.message.set(''); this.refreshRequired.set(false);
  }
  captureAnother(): void { if (!this.needsProtection()) { this.saved.set(undefined); this.message.set(''); } }
  resolveLeave(): Promise<boolean> {
    if (!this.needsProtection()) return Promise.resolve(true);
    this.message.set(this.refreshRequired() ? 'Retry refresh before leaving; this visualization has already been saved.'
      : this.saving() ? 'Wait for capture to finish before leaving.' : 'Retry or explicitly discard the retained capture before leaving.');
    return Promise.resolve(false);
  }
  dispose(): void { this.destroyed = true; this.unregister?.(); this.unregister = undefined; }
}

function message(error: unknown): string { return error instanceof Error ? error.message : 'The capture could not be saved. Retry the retained proposal or discard it.'; }
