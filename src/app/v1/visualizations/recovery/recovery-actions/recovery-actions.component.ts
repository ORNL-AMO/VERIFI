import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { CreateVisualizationCommand } from '@data/account-workspace/visualization-commands.models';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { SAVED_VISUALIZATION_RECORD_VERSION } from '@data/models/idbModels/savedVisualization';
import { VisualizationDefinition, VisualizationScope } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { visualizationReferences, visualizationReferenceKey } from '@domain/visualizations/visualization-references';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { singleFacilityPresentation } from '@app/v1/shared/navigation/single-facility-presentation';
import { VisualizationEditorSession } from '../../editing/visualization-editor-session.service';
import { normalizeVisualizationIntent } from '../../editing/visualization-reconciliation';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { reviewVisualizationReset, reviewVisualizationScopeCopy, VisualizationResetReview } from '../../visualization-recovery';

@Component({ selector: 'app-visualization-recovery-actions', standalone: false,
  templateUrl: './recovery-actions.component.html', styleUrls: ['./recovery-actions.component.css'] })
export class RecoveryActionsComponent {
  readonly editor = inject(VisualizationEditorSession);
  readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(SavedVisualizationCommands);
  private readonly journeys = inject(VisualizationNavigationService);
  private readonly modal = inject(ModalPortalService);
  private readonly unsaved = inject(UnsavedChangesService);
  private readonly view = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly query = toSignal(this.route?.queryParamMap ?? of(convertToParamMap({})), { requireSync: true });
  private handledCopy = '';
  private portal?: TemplatePortal;
  private reviewedKey = '';
  private reviewedRevision = 0;
  private reviewedWorkspace?: unknown;
  private readonly base = signal<VisualizationDefinition | undefined>(undefined);
  readonly mode = signal<'reset' | 'copy' | 'new' | undefined>(undefined);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly proposal = signal<CreateVisualizationCommand | undefined>(undefined);
  private readonly refreshRequired = signal(false);
  readonly scopeControl = new FormControl('portfolio', { nonNullable: true });
  private readonly selectedScope = toSignal(this.scopeControl.valueChanges, { initialValue: 'portfolio' });
  readonly singleFacility = computed(() => singleFacilityPresentation(this.workspace.account(), this.workspace.facilities(), this.workspace.isReady()));
  readonly issues = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot(), record = this.editor.record();
    return definition && snapshot ? inspectVisualizationReferences(this.withEnvelopeOwner(definition), snapshot, record?.preservation?.references) : [];
  });
  readonly canReset = computed(() => !!this.editor.definition() && !!this.editor.record()
    && this.editor.record()!.recordVersion === SAVED_VISUALIZATION_RECORD_VERSION
    && (this.issues().length > 0 || this.editor.record()!.preservation?.locked)
    && !this.issues().some(issue => issue.path === 'scope.facilityGuid' && !this.editor.record()?.preservation?.locked));
  readonly stale = computed(() => !!this.mode() && (this.editor.key() !== this.reviewedKey
    || this.editor.localRevision() !== this.reviewedRevision || this.workspace.snapshot() !== this.reviewedWorkspace));
  readonly review = computed<VisualizationResetReview | undefined>(() => {
    const base = this.base(), snapshot = this.workspace.snapshot(), mode = this.mode();
    if (!base || !snapshot || !mode) return undefined;
    if (mode === 'reset') return reviewVisualizationReset(base, this.issues(), !!this.editor.record()?.preservation?.locked);
    const value = this.selectedScope();
    const scope: VisualizationScope = value === 'portfolio' ? { kind: 'portfolio' } : { kind: 'facility', facilityGuid: value };
    if (this.singleFacility() ? scope.kind !== 'facility' || scope.facilityGuid !== this.singleFacility()!.guid
      : scope.kind === 'facility' && !snapshot.facilities.some(facility => facility.guid === scope.facilityGuid && facility.accountId === base.accountGuid)) return undefined;
    return reviewVisualizationScopeCopy(base, scope, snapshot);
  });
  readonly protected = computed(() => this.saving() || !!this.proposal());
  readonly referencesForReview = computed(() => {
    const base = this.base(), review = this.review();
    if (!base || !review) return [];
    const retained = visualizationReferences(review.definition);
    const candidates = [...(this.mode() === 'reset' ? this.editor.record()?.preservation?.references ?? [] : []), ...visualizationReferences(base)];
    const cleared = candidates.filter(ref => review.referencePaths.includes(ref.path)
      || !retained.some(next => next.path === ref.path && next.guid === ref.guid));
    return [...new Map(cleared.map(ref => [`${ref.kind}:${visualizationReferenceKey(ref)}`, ref])).values()];
  });
  @ViewChild('reviewDialog', { static: true }) private reviewDialog!: TemplateRef<unknown>;

  constructor() {
    effect(() => {
      const requested = this.query().get('action'), key = this.editor.key();
      if (requested === 'copy-scope' && key && this.editor.record() && this.editor.canEdit() && this.handledCopy !== key) {
        this.handledCopy = key;
        untracked(() => { void this.start('copy'); });
      }
    });
    const release = this.unsaved.register(() => !!this.proposal(), () => this.cancel(), () => this.saving() || this.refreshRequired());
    const unprotect = this.unsaved.protectBeforeUnload(this.protected);
    const unpreflight = this.unsaved.registerNavigationPreflight(async () => !this.protected());
    this.destroy.onDestroy(() => { release(); unprotect(); unpreflight(); this.hide(); });
  }

  async start(mode: 'reset' | 'copy' | 'new'): Promise<void> {
    if (this.saving() || this.proposal() || !this.workspace.isReady()) return;
    if (mode !== 'reset' && this.workspace.account()?.isSingleFacilityCompany && !this.singleFacility()) {
      this.error.set('Restore the sole facility or convert this account to a portfolio before creating a copy.'); return;
    }
    if (mode !== 'new' && !await this.editor.flush()) return;
    const definition = this.editor.definition();
    if (!definition) return;
    const decoded = decodeVisualizationDefinition(normalizeVisualizationIntent(definition));
    if (decoded.state !== 'valid' && decoded.state !== 'setup-required') { this.error.set('Correct invalid input before reviewing recovery.'); return; }
    if (mode === 'reset' && !this.canReset() || mode === 'copy' && (!this.editor.canEdit() || this.editor.isMissing())
      || mode === 'new' && !this.editor.isMissing()) return;
    const base = this.withEnvelopeOwner(decoded.definition);
    const single = this.singleFacility();
    this.scopeControl.enable({ emitEvent: false });
    this.scopeControl.setValue(single?.guid ?? (base.scope.kind === 'facility' ? base.scope.facilityGuid : 'portfolio'));
    this.base.set(base); this.mode.set(mode); this.error.set('');
    this.reviewedKey = this.editor.key(); this.reviewedRevision = this.editor.localRevision(); this.reviewedWorkspace = this.workspace.snapshot();
    this.portal = new TemplatePortal(this.reviewDialog, this.view); this.modal.show(this.portal, { blockWorkspace: true });
  }

  async confirm(): Promise<void> {
    if (this.saving()) return;
    if (this.proposal()) { await this.persistProposal(); return; }
    if (this.stale() || !this.review()) return;
    const review = this.review()!;
    if (this.mode() === 'reset') {
      this.editor.applyDefinition(review.definition, { acknowledgeTransfer: !!this.editor.record()?.preservation?.locked, referencePaths: review.referencePaths });
      this.saving.set(true);
      try {
        if (await this.editor.flush()) this.cancel(true);
        else this.error.set(this.editor.error() || 'The reviewed reset is retained in the editor. Stay to resolve the save.');
      } finally { this.saving.set(false); }
      return;
    }
    this.proposal.set(this.commands.prepareCreate(review.definition));
    this.scopeControl.disable({ emitEvent: false });
    await this.persistProposal();
  }

  private async persistProposal(): Promise<void> {
    const proposal = this.proposal();
    if (!proposal || this.workspace.account()?.guid !== proposal.accountGuid || !this.workspace.isReady()) return;
    this.saving.set(true); this.error.set('');
    try {
      if (this.refreshRequired()) {
        const recovered = await this.commands.recover(proposal.accountGuid, proposal.guid);
        if (!recovered) throw new Error('The committed copy is unavailable. Retry workspace recovery.');
      } else {
        const outcome = await this.commands.submit(proposal);
        if (outcome.state !== 'committed') {
          this.refreshRequired.set(outcome.state === 'refresh-required');
          this.error.set(outcome.state === 'refresh-required' ? 'The copy was saved. Retry to recover its workspace publication.'
            : 'The copy could not be created. Retry uses the same proposed identity.');
          return;
        }
      }
      // Only discard a deleted original after the new identity has been acknowledged.
      if (this.mode() === 'new') this.editor.discard();
      this.proposal.set(undefined); this.refreshRequired.set(false); this.hide(); this.mode.set(undefined);
      this.saving.set(false);
      if (!await this.journeys.open(proposal.accountGuid, proposal.guid)) this.error.set('The new visualization was saved, but could not be opened. Find it on Dashboard.');
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'The copy could not be recovered.'); }
    finally { this.saving.set(false); }
  }

  cancel(afterReset = false): void {
    if (!afterReset && (this.saving() || this.refreshRequired())) return;
    this.proposal.set(undefined); this.base.set(undefined); this.mode.set(undefined); this.hide();
  }

  private hide(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
  }

  private withEnvelopeOwner(definition: VisualizationDefinition): VisualizationDefinition {
    const record = this.editor.record();
    return record ? { ...definition, accountGuid: record.accountId, scope: record.facilityId ? { kind: 'facility', facilityGuid: record.facilityId } : { kind: 'portfolio' } } : definition;
  }
}
