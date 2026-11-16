import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SavedVisualizationCommands } from '@data/account-workspace/saved-visualization-commands.service';
import { CreateVisualizationCommand } from '@data/account-workspace/visualization-commands.models';
import { inspectVisualizationReferences } from '@data/account-workspace/visualization-reference-inspection';
import { SAVED_VISUALIZATION_RECORD_VERSION } from '@data/models/idbModels/savedVisualization';
import { VisualizationDefinition, VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { visualizationReferences, visualizationReferenceKey } from '@domain/visualizations/visualization-references';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { orderFacilities } from '@app/v1/shared/facilities/facility-order';
import { VisualizationEditorSession } from '../../editing/visualization-editor-session.service';
import { normalizeVisualizationIntent } from '../../editing/visualization-reconciliation';
import { VisualizationNavigationService } from '../../visualization-navigation.service';
import { reviewVisualizationReset, reviewVisualizationFacilityCopy, VisualizationResetReview } from '../../visualization-recovery';

/** Child forms retain incomplete input outside the last coherent saved definition. */
export interface VisualizationChildDraftGuard {
  readonly invalid: Signal<boolean>;
  readonly key: Signal<string>;
  readonly discard: () => void;
}
type RecoveryMode = 'reset' | 'copy' | 'new';

@Component({ selector: 'app-visualization-recovery-actions', standalone: false,
  templateUrl: './recovery-actions.component.html', styleUrls: ['./recovery-actions.component.css'] })
export class RecoveryActionsComponent {
  readonly childDrafts = input<VisualizationChildDraftGuard>();
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
  readonly mode = signal<RecoveryMode | undefined>(undefined);
  readonly childDraftDecision = signal<RecoveryMode | undefined>(undefined);
  private childDraftReviewKey = '';
  private readonly hasChildDrafts = computed(() => this.childDrafts()?.invalid() ?? false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly proposal = signal<CreateVisualizationCommand | undefined>(undefined);
  private readonly refreshRequired = signal(false);
  readonly facilitySelectionControl = new FormControl<VisualizationFacilitySelection>({ kind: 'all' }, { nonNullable: true });
  readonly selectedFacilities = toSignal(this.facilitySelectionControl.valueChanges, { initialValue: this.facilitySelectionControl.value });
  readonly facilities = computed(() => orderFacilities(this.workspace.facilities().filter(facility => facility.accountId === this.workspace.account()?.guid), this.workspace.account()?.portfolioFacilityOrder));
  readonly issues = computed(() => {
    const definition = this.editor.definition(), snapshot = this.workspace.snapshot(), record = this.editor.record();
    return definition && snapshot ? inspectVisualizationReferences(this.withAccountOwner(definition), snapshot, record?.preservation?.references) : [];
  });
  readonly canReset = computed(() => !!this.editor.definition() && !!this.editor.record()
    && this.editor.record()!.recordVersion === SAVED_VISUALIZATION_RECORD_VERSION
    && (this.issues().length > 0 || this.editor.record()!.preservation?.locked)
    && !this.issues().some(issue => issue.path.startsWith('facilitySelection.') && !this.editor.record()?.preservation?.locked));
  readonly stale = computed(() => !!this.mode() && (this.editor.key() !== this.reviewedKey
    || this.editor.localRevision() !== this.reviewedRevision || this.workspace.snapshot() !== this.reviewedWorkspace));
  readonly review = computed<VisualizationResetReview | undefined>(() => {
    const base = this.base(), snapshot = this.workspace.snapshot(), mode = this.mode();
    if (!base || !snapshot || !mode) return undefined;
    if (mode === 'reset') return reviewVisualizationReset(base, this.issues(), !!this.editor.record()?.preservation?.locked);
    const selection = this.selectedFacilities();
    if (!snapshot.facilities.some(facility => facility.accountId === base.accountGuid)
      || selection.kind === 'fixed' && selection.facilityGuids.some(guid => !snapshot.facilities.some(facility => facility.guid === guid && facility.accountId === base.accountGuid))) return undefined;
    return reviewVisualizationFacilityCopy(base, selection, snapshot);
  });
  readonly protected = computed(() => this.saving() || !!this.proposal() || !!this.childDraftDecision());
  readonly referencesForReview = computed(() => {
    const base = this.base(), review = this.review();
    if (!base || !review) return [];
    const retained = visualizationReferences(review.definition).filter(reference => !reference.optional);
    const candidates = [...(this.mode() === 'reset' ? this.editor.record()?.preservation?.references ?? [] : []), ...visualizationReferences(base).filter(reference => !reference.optional)];
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
    const unpreflight = this.unsaved.registerNavigationPreflight(async () => !this.blocksNavigation());
    this.destroy.onDestroy(() => { release(); unprotect(); unpreflight(); this.hide(); });
  }

  /** Pending recovery owns its review until saved intent is acknowledged or a rejected proposal is canceled. */
  blocksNavigation(): boolean {
    if (!this.protected()) return false;
    if (this.mode() || this.childDraftDecision()) {
      this.portal ??= new TemplatePortal(this.reviewDialog, this.view);
      if (this.modal.activePortal() !== this.portal) this.modal.show(this.portal, { blockWorkspace: true });
    }
    return true;
  }

  async start(mode: RecoveryMode): Promise<void> {
    if (this.saving() || !this.workspace.isReady()) return;
    if (this.proposal()) { this.blocksNavigation(); return; }
    if (mode === 'reset' && !this.canReset() || mode === 'copy' && (!this.editor.canEdit() || this.editor.isMissing())
      || mode === 'new' && !this.editor.isMissing()) return;
    if (this.hasChildDrafts()) { this.requestChildDraftDecision(mode); return; }
    if (mode !== 'new' && !await this.editor.flush()) return;
    if (this.hasChildDrafts()) { this.requestChildDraftDecision(mode); return; }
    const definition = this.editor.definition();
    if (!definition) return;
    const decoded = decodeVisualizationDefinition(normalizeVisualizationIntent(definition));
    if (decoded.state !== 'valid' && decoded.state !== 'setup-required') { this.error.set('Correct invalid input before reviewing recovery.'); return; }
    if (mode === 'reset' && !this.canReset() || mode === 'copy' && (!this.editor.canEdit() || this.editor.isMissing())
      || mode === 'new' && !this.editor.isMissing()) return;
    const base = this.withAccountOwner(decoded.definition);
    this.facilitySelectionControl.enable({ emitEvent: false });
    this.facilitySelectionControl.setValue(structuredClone(base.facilitySelection));
    this.base.set(base); this.mode.set(mode); this.error.set('');
    this.reviewedKey = this.editor.key(); this.reviewedRevision = this.editor.localRevision(); this.reviewedWorkspace = this.workspace.snapshot();
    this.portal = new TemplatePortal(this.reviewDialog, this.view); this.modal.show(this.portal, { blockWorkspace: true });
  }

  async confirm(): Promise<void> {
    if (this.saving()) return;
    if (this.hasChildDrafts() && this.mode()) { this.requestChildDraftDecision(this.mode()!); return; }
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
    this.facilitySelectionControl.disable({ emitEvent: false });
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
      // Publication can update child contexts while a recovery write is in flight. Never
      // tear them down without a new explicit decision, and never replay the committed create.
      if (this.hasChildDrafts()) {
        this.refreshRequired.set(true);
        this.error.set('The new visualization was saved. Resolve the unsaved field input before finishing recovery; Retry will recover this identity without creating it again.');
        this.requestChildDraftDecision(this.mode()!); return;
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
    this.proposal.set(undefined); this.base.set(undefined); this.mode.set(undefined); this.childDraftDecision.set(undefined); this.hide();
  }

  private requestChildDraftDecision(mode: RecoveryMode): void {
    this.childDraftReviewKey = this.childDrafts()?.key() ?? '';
    this.childDraftDecision.set(mode);
    this.portal ??= new TemplatePortal(this.reviewDialog, this.view);
    this.modal.show(this.portal, { blockWorkspace: true });
  }

  async discardChildDraftsAndContinue(): Promise<void> {
    const mode = this.childDraftDecision(), fields = this.childDrafts();
    if (!mode || this.saving() || !fields) return;
    if (fields.key() !== this.childDraftReviewKey) { this.error.set('The edited visualization changed. Cancel this review and reopen recovery.'); return; }
    fields.discard();
    if (fields.invalid()) { this.error.set('The incomplete field input could not be discarded. Stay to resolve it.'); return; }
    this.childDraftDecision.set(undefined);
    if (this.proposal()) { await this.persistProposal(); return; }
    this.hide(); this.mode.set(undefined); this.base.set(undefined);
    await this.start(mode);
  }

  cancelChildDraftDecision(): void {
    if (this.saving()) return;
    this.childDraftDecision.set(undefined);
    if (!this.proposal()) this.cancel(); else this.hide();
  }

  private hide(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
  }

  private withAccountOwner(definition: VisualizationDefinition): VisualizationDefinition {
    const record = this.editor.record();
    return record ? { ...definition, accountGuid: record.accountId } : definition;
  }
}
