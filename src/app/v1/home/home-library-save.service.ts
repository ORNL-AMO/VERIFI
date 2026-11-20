import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { CreateVisualizationCommand, HomeVisualizationSource } from '@data/account-workspace/visualization-commands.models';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { HomeContext } from './home-context.service';

/** Explicit library creation is independent of saving a dashboard customization. */
@Injectable({ providedIn: 'root' })
export class HomeLibrarySave {
  private readonly home = inject(HomeContext);
  private readonly commands = inject(SavedVisualizationCommands);
  readonly draft = signal<{ widgetId: string; definition: VisualizationDefinition; source: HomeVisualizationSource } | undefined>(undefined);
  readonly proposal = signal<CreateVisualizationCommand | undefined>(undefined);
  readonly saving = signal(false);
  readonly refreshRequired = signal(false);
  readonly message = signal('');
  readonly saved = signal<{ accountGuid: string; guid: string } | undefined>(undefined);
  readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });
  readonly needsProtection = computed(() => !!this.draft() || !!this.proposal() || this.saving());
  constructor() {
    const changes = inject(UnsavedChangesService), destroy = inject(DestroyRef);
    const registrations = [changes.register(this.needsProtection, () => this.cancel(), () => this.saving() || this.refreshRequired()),
      changes.protectBeforeUnload(this.needsProtection), changes.registerNavigationPreflight(() => this.resolveLeave())];
    destroy.onDestroy(() => registrations.forEach(unregister => unregister()));
  }
  begin(widgetId: string, definition: VisualizationDefinition): void {
    if (this.needsProtection() || !this.home.workspace.canWrite()) return;
    const widget = (this.home.definition()?.widgets ?? []).find(widget => widget.id === widgetId), owner = this.home.owner(), record = this.home.selected()?.record;
    if (widget?.kind !== 'built-in-chart' || !owner) return;
    this.draft.set({ widgetId, definition: structuredClone(definition), source: { owner, view: this.home.selected()!.reference, widgetId, reference: widget.reference,
      expectedOwnerRevision: this.home.view()?.record?.revision ?? null, ...(record ? { dashboard: { guid: record.guid, revision: record.revision } } : {}) } });
    this.name.enable({ emitEvent: false }); this.name.setValue(definition.name); this.message.set('Choose a library name. This creates a reusable visualization; the Home widget keeps its built-in configuration.'); this.saved.set(undefined);
  }
  async save(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.saving() || !this.home.workspace.canWrite() && !this.refreshRequired()) return;
    if (!this.proposal()) {
      if (!this.name.valid) { this.name.markAsTouched(); return; }
      this.proposal.set({ ...this.commands.prepareCreate({ ...draft.definition, name: this.name.value.trim() }), homeSource: draft.source });
    }
    const proposal = this.proposal()!;
    if (this.home.workspace.account()?.guid !== proposal.accountGuid) return;
    this.saving.set(true); this.name.disable({ emitEvent: false });
    try {
      if (this.refreshRequired()) {
        const read = await this.commands.recover(proposal.accountGuid, proposal.guid);
        if (!read) throw new Error('The saved visualization is unavailable. Keep this receipt and retry refresh.');
      } else {
        const result = await this.commands.submit(proposal);
        if (result.state !== 'committed') {
          this.refreshRequired.set(result.state === 'refresh-required');
          this.message.set(result.state === 'refresh-required' ? 'Visualization saved. Retry refresh without saving again.' : result.error instanceof Error ? result.error.message : 'Save rejected. Retry this proposal or cancel and review the source.'); return;
        }
      }
      this.saved.set({ accountGuid: proposal.accountGuid, guid: proposal.guid }); this.draft.set(undefined); this.proposal.set(undefined); this.refreshRequired.set(false);
      this.message.set('Visualization saved to the library. The Home widget still uses its built-in configuration.');
    } catch (error) { this.message.set(error instanceof Error ? error.message : 'Save rejected. Your proposal is retained.'); }
    finally { this.saving.set(false); }
  }
  cancel(): void {
    if (this.saving() || this.refreshRequired()) return;
    this.draft.set(undefined); this.proposal.set(undefined); this.name.enable({ emitEvent: false }); this.message.set('');
  }
  resolveLeave(): Promise<boolean> {
    if (!this.needsProtection()) return Promise.resolve(true);
    this.message.set(this.refreshRequired() ? 'Refresh the saved visualization before leaving.' : 'Save or cancel the library draft before leaving Home.');
    return Promise.resolve(false);
  }
}
