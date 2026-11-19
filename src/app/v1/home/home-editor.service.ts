import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { HomeCommand, HomeCommandOutcome } from '@data/account-workspace/home-commands.models';
import { homeRecordOwner } from '@data/models/idbModels/homeRecord';
import { IdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { HomeTemplateBlueprint } from '@data/home/home-template-graph';
import { readHomeDashboard, readHomeOwner } from '@data/home/home-record';
import { sameHomeJson } from '@data/home/home-references';
import { HomeDashboardDefinition, HomeOwner, HomeTemplate, homeOwnerKey, sameHomeOwner } from '@domain/home/home-dashboard';
import { decodeHomeDashboard } from '@domain/home/home-validation';
import { homeDashboardRoute } from '@app/v1/routing/workspace-route';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { HomeContext } from './home-context.service';
import { HomeTemplateCatalog } from './home-template-catalog.service';

export interface HomeEditSession {
  readonly key: string;
  readonly accountGuid: string;
  readonly owner: HomeOwner;
  readonly mode: 'view' | 'edit' | 'create' | 'restore';
  readonly revision: number;
  readonly baseline?: Readonly<IdbHomeDashboard>;
  readonly ownerRevision?: number | null;
  readonly definition?: HomeDashboardDefinition;
  readonly blueprint?: HomeTemplateBlueprint;
  readonly recipe?: HomeTemplate;
  readonly dirty?: boolean;
  readonly saving?: boolean;
  readonly proposal?: HomeCommand;
  readonly outcome?: HomeCommandOutcome;
  readonly conflictLoaded?: boolean;
  readonly reviewedDashboard?: Readonly<IdbHomeDashboard>;
  readonly reviewedOwner?: Readonly<IdbHomeOwner>;
  readonly message?: string;
}
interface HomeConfirmation {
  readonly key: string;
  readonly revision: number;
  readonly kind: 'leave' | 'discard' | 'delete' | 'restore';
  readonly title: string;
  readonly detail: string;
  readonly label: string;
  readonly command?: HomeCommand;
}

/** Session-only drafts and receipts are isolated by account, owner and explicit dashboard URL. */
@Injectable({ providedIn: 'root' })
export class HomeEditor {
  readonly home = inject(HomeContext);
  readonly catalog = inject(HomeTemplateCatalog);
  private readonly commands = inject(HomeCommands);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly sessions = signal<ReadonlyMap<string, HomeEditSession>>(new Map());
  readonly key = computed(() => {
    const owner = this.home.owner(), account = this.home.workspace.account();
    return owner && account ? `${homeOwnerKey(account.guid, owner)}:${JSON.stringify(this.home.context.routeState().homeDashboardGuid ?? 'overview')}` : undefined;
  });
  readonly session = computed(() => { const key = this.key(); return key ? this.sessions().get(key) : undefined; });
  readonly confirmation = signal<HomeConfirmation | undefined>(undefined);
  readonly focusRequest = signal<{ readonly target: 'heading' | 'name' | 'recipe' | 'dashboard-order'; readonly guid?: string; readonly sequence: number } | undefined>(undefined);
  private navigationEpoch = 0;
  private viewEpoch = 0;
  private readonly receiptDeparture = signal<{ readonly key: string; readonly revision: number; readonly workspaceError: unknown } | undefined>(undefined);
  private readonly receiptDepartureAccepted = computed(() => {
    const session = this.session(), accepted = this.receiptDeparture();
    return !!session && session.outcome?.state === 'refresh-required' && accepted?.key === session.key && accepted.revision === session.revision;
  });
  private leaveResolve?: (allow: boolean) => void;
  private leavePromise?: Promise<boolean>;
  readonly saving = computed(() => [...this.sessions().values()].some(session => session.saving));
  readonly needsProtection = computed(() => this.saving() || !this.receiptDepartureAccepted() && (!!this.session()?.dirty || !!this.session()?.proposal));
  readonly canAct = computed(() => !!this.key() && this.home.workspace.canWrite() && !this.home.workspace.hasPending() && !this.saving());
  readonly canStart = computed(() => this.canAct() && !this.needsProtection() && !this.session()?.proposal);
  readonly adopted = computed(() => this.home.view()?.initialization === 'initialized');
  readonly canEdit = computed(() => this.canAct() && !!this.session()?.definition && this.session()?.mode !== 'view' && !this.session()?.proposal && this.home.view()?.initialization !== 'unavailable');
  readonly canSave = computed(() => this.canEdit() && this.session()?.mode !== 'restore'
    && !!this.session()?.dirty && decodeHomeDashboard(this.session()?.definition).state === 'valid');
  readonly canRetry = computed(() => this.canAct() && !!this.session()?.proposal && ['failed', 'refresh-required'].includes(this.session()?.outcome?.state ?? ''));
  readonly canRecoverPublication = computed(() => this.home.workspace.isReady() && !!this.home.workspace.account()
    && !this.home.workspace.hasPending() && !this.saving());
  readonly pendingPublications = computed(() => {
    const account = this.home.workspace.account(), key = this.key();
    if (!this.home.workspace.isReady() || !account) return [];
    return [...this.sessions().values()].filter(session => session.accountGuid === account.guid && session.key !== key && session.outcome?.state === 'refresh-required')
      .map(session => {
        const command = session.proposal!;
        const name = session.definition?.name || readDefinition(session.baseline)?.name || (command.kind === 'duplicate' ? command.name
          : command.kind === 'create' || command.kind === 'restore' || command.kind === 'upgrade' ? command.graph.dashboards[0]?.definition.name : undefined);
        const ownerName = session.owner.kind === 'account' ? account.name : this.home.workspace.facilities().find(item => item.guid === session.owner.guid)?.name ?? 'Unavailable facility';
        return { key: session.key, label: `${name || 'Home navigation change'} · ${ownerName}` };
      });
  });
  private readonly publicationNotice = signal<{ readonly accountGuid: string; readonly message: string } | undefined>(undefined);
  readonly publicationMessage = computed(() => this.publicationNotice()?.accountGuid === this.home.workspace.account()?.guid ? this.publicationNotice()?.message : undefined);
  readonly form = new FormGroup({ name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    recipe: new FormControl<HomeTemplate>('blank', { nonNullable: true }) });
  readonly conflictDefinition = computed(() => {
    const session = this.session(), outcome = session?.outcome;
    const record = outcome?.state === 'conflict' ? session?.conflictLoaded ? session.reviewedDashboard : outcome.error.currentDashboard : undefined;
    const read = record && readHomeDashboard(record);
    return read?.state === 'valid' ? read.value : undefined;
  });

  readonly conflictOwnerChoices = computed(() => {
    const session = this.session(), outcome = session?.outcome;
    const record = session?.conflictLoaded ? session.reviewedOwner : outcome?.state === 'conflict' ? outcome.error.currentOwner : undefined;
    const read = record && readHomeOwner(record);
    return read?.state === 'valid' ? { defaultName: record!.preservation?.references.some(ref => ref.path === 'defaultDashboardGuid') ? 'Unavailable retained preference' : this.dashboardLabel(read.value.defaultDashboardGuid),
      order: read.value.dashboardOrder.map(guid => record!.preservation?.references.some(ref => ref.path === `dashboardOrder.${guid}`) ? 'Unavailable retained preference' : this.dashboardLabel(guid)) } : undefined;
  });
  private dashboardLabel(guid?: string): string {
    if (!guid) return 'No selected default';
    const record = this.home.workspace.homeDashboards().find(record => record.guid === guid);
    return record ? readDefinition(record)?.name ?? 'Unavailable dashboard' : 'Unavailable dashboard';
  }

  constructor() {
    const changes = inject(UnsavedChangesService);
    const unregister = changes.register(() => this.needsProtection(), () => this.discard(), () => this.saving());
    const unload = changes.protectBeforeUnload(this.needsProtection);
    const preflight = changes.registerNavigationPreflight(() => this.resolveLeave());
    this.destroy.onDestroy(() => { unregister(); unload(); preflight(); this.finishLeave(false); });
    this.router.events.pipe(filter(event => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError || event instanceof NavigationSkipped), takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) { this.navigationEpoch++; this.publicationNotice.set(undefined); }
      if (!(event instanceof NavigationCancel && event.code === NavigationCancellationCode.Redirect)) this.receiptDeparture.set(undefined);
    });
    effect(() => {
      const accepted = this.receiptDeparture(), error = this.home.workspace.error();
      if (accepted && error && error !== accepted.workspaceError) this.receiptDeparture.set(undefined);
    });
    this.form.controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(name => {
      const session = this.session();
      if (this.canEdit() && session?.definition && session.mode !== 'restore' && name !== session.definition.name)
        this.changeDefinition({ ...session.definition, name });
    });
    this.form.controls.recipe.valueChanges.pipe(takeUntilDestroyed()).subscribe(recipe => this.chooseRecipe(recipe));
    effect(() => {
      const session = this.session(), enabled = this.canEdit();
      this.form.patchValue({ name: session?.definition?.name ?? '', recipe: session?.recipe ?? 'blank' }, { emitEvent: false });
      const nameEnabled = enabled && session?.mode !== 'restore';
      const recipeEnabled = enabled && session?.mode !== 'edit';
      nameEnabled ? this.form.controls.name.enable({ emitEvent: false }) : this.form.controls.name.disable({ emitEvent: false });
      recipeEnabled ? this.form.controls.recipe.enable({ emitEvent: false }) : this.form.controls.recipe.disable({ emitEvent: false });
    });
    effect(() => {
      const key = this.key(), confirmation = this.confirmation();
      if (confirmation && key !== confirmation.key) untracked(() => this.cancelConfirmation());
    });
  }

  attach(): () => void { this.viewEpoch++; return () => { this.viewEpoch++; this.cancelConfirmation(); }; }
  private current(): HomeEditSession | undefined {
    const key = this.key(), owner = this.home.owner(), accountGuid = this.home.workspace.account()?.guid;
    return key && owner && accountGuid ? this.sessions().get(key) ?? { key, accountGuid, owner, mode: 'view', revision: 0 } : undefined;
  }
  private put(session: HomeEditSession): void { this.sessions.update(sessions => new Map(sessions).set(session.key, session)); }
  private patch(key: string, patch: Partial<HomeEditSession>): void {
    const session = this.sessions().get(key);
    if (session) this.put({ ...session, ...patch });
  }
  private focus(target: 'heading' | 'name' | 'recipe' | 'dashboard-order', guid?: string): void { this.focusRequest.update(value => ({ target, guid, sequence: (value?.sequence ?? 0) + 1 })); }
  beginEdit(): void {
    const session = this.current(), selected = this.home.selected();
    if (!session || !selected || selected.read.state !== 'valid' || !this.canStart() || this.confirmation() || !this.adopted()) return;
    this.put({ ...session, mode: 'edit', baseline: structuredClone(selected.record), ownerRevision: this.home.view()?.record?.revision ?? null,
      definition: structuredClone(selected.read.value), dirty: false, message: undefined });
    this.focus('name');
  }
  beginCreate(): void {
    const session = this.current();
    if (!session || !this.canStart() || this.confirmation() || this.home.view()?.initialization === 'unavailable') return;
    const blueprint = this.catalog.build('blank', session.accountGuid, session.owner);
    this.put({ ...session, mode: 'create', recipe: 'blank', blueprint, baseline: undefined,
      ownerRevision: this.home.view()?.record?.revision ?? null, definition: { ...blueprint.dashboard, name: '' }, dirty: false, message: undefined });
    this.focus('name');
  }
  beginRestore(): void {
    const session = this.current(), selected = this.home.selected();
    if (!session || !selected || selected.read.state !== 'valid' || !this.canStart() || this.confirmation() || !this.adopted()) return;
    const blueprint = this.catalog.build('blank', session.accountGuid, session.owner);
    this.put({ ...session, mode: 'restore', baseline: structuredClone(selected.record), ownerRevision: this.home.view()?.record?.revision ?? null,
      recipe: 'blank', blueprint, definition: blueprint.dashboard, dirty: false, message: undefined });
    this.focus('recipe');
  }
  chooseRecipe(recipe: HomeTemplate): void {
    const session = this.session();
    if (!session || !this.canEdit() || !['create', 'restore'].includes(session.mode) || session.recipe === recipe) return;
    try {
      const blueprint = this.catalog.build(recipe, session.accountGuid, session.owner);
      this.put({ ...session, recipe, blueprint, definition: { ...blueprint.dashboard,
        name: session.mode === 'create' ? session.definition!.name : blueprint.dashboard.name }, dirty: true, revision: session.revision + 1 });
    } catch (error) { this.patch(session.key, { message: message(error) }); }
  }
  changeDefinition(definition: HomeDashboardDefinition): void {
    const session = this.session();
    if (!session || !this.canEdit() || sameHomeJson(definition, session.definition)) return;
    this.put({ ...session, definition: structuredClone(definition), dirty: session.mode === 'create' || !sameHomeJson(definition, readDefinition(session.baseline)),
      revision: session.revision + 1, message: undefined });
  }
  async save(): Promise<void> {
    const session = this.session();
    if (!session || !this.canSave()) { this.form.markAllAsTouched(); return; }
    try {
      const definition = { ...session.definition!, name: session.definition!.name.trim() };
      const prepared = session.mode === 'create' ? this.commands.prepareCreate(session.owner, { ...session.blueprint!, dashboard: definition })
        : this.commands.prepareUpdate(session.baseline!, definition);
      this.put({ ...session, proposal: { ...prepared, expectedOwnerRevision: session.ownerRevision ?? null } });
      await this.execute(session.key);
    } catch (error) { this.patch(session.key, { message: message(error) }); }
  }
  async adopt(): Promise<void> {
    if (!this.canStart() || this.home.view()?.initialization !== 'legacy' || !this.home.view()?.records.length) return;
    await this.start(() => this.commands.prepareInitialize(this.home.owner()!, []));
  }
  duplicate(): Promise<void> {
    const record = this.home.selected()?.record;
    return record && this.adopted() ? this.start(() => this.commands.prepareDuplicate(record)) : Promise.resolve();
  }
  setDefault(guid: string): Promise<void> {
    const view = this.home.view();
    if (!view?.state || !this.adopted() || !this.home.entries().some(entry => entry.record.guid === guid && entry.read.state === 'valid')) return Promise.resolve();
    const repairPaths = view.record?.preservation?.references.some(ref => ref.kind === 'dashboard' && ref.path === 'defaultDashboardGuid') ? ['defaultDashboardGuid'] : undefined;
    return this.start(() => this.commands.prepareConfigure(this.home.owner()!, { ...view.state, dashboardOrder: completeOrder(view), defaultDashboardGuid: guid }, repairPaths));
  }
  async moveDashboard(guid: string, offset: -1 | 1): Promise<void> {
    const view = this.home.view(), entries = this.home.entries();
    const index = entries.findIndex(entry => entry.record.guid === guid), target = entries[index + offset];
    if (!view?.state || !this.adopted() || index < 0 || !target) return;
    const order = completeOrder(view), from = order.indexOf(guid), to = order.indexOf(target.record.guid);
    [order[from], order[to]] = [order[to], order[from]];
    const key = this.key();
    await this.start(() => this.commands.prepareConfigure(this.home.owner()!, { ...view.state!, dashboardOrder: order }));
    if (this.key() === key && !this.session()?.proposal) this.focus('dashboard-order', guid);
  }
  requestDelete(): void {
    const session = this.current(), selected = this.home.selected();
    if (!session || !selected || !this.canStart() || this.confirmation() || !this.adopted()) return;
    this.put({ ...session, baseline: structuredClone(selected.record) });
    this.confirmation.set({ key: session.key, revision: session.revision, kind: 'delete', title: `Delete “${selected.name}”?`,
      detail: `Delete this dashboard from ${this.home.ownerName()}. Linked saved visualizations and source data will remain.`, label: 'Delete dashboard', command: this.commands.prepareDelete(selected.record) });
  }
  requestRestore(): void {
    const session = this.session();
    if (!session || session.mode !== 'restore' || !this.canEdit()) return;
    try {
      const command = { ...this.commands.prepareTemplateReplacement(session.baseline!, session.blueprint!), expectedOwnerRevision: session.ownerRevision ?? null };
      this.confirmation.set({ key: session.key, revision: session.revision, kind: 'restore', title: `Restore “${readDefinition(session.baseline)?.name}” from ${session.definition!.name}?`,
        detail: `For ${this.home.ownerName()}, replace the dashboard’s name, layout, widgets and saved defaults. Its identity, sidebar position, visibility and selected-default choices remain. ${session.blueprint!.charts.length ? 'Fresh template visualizations will be created; every former chart will remain.' : 'This template creates no saved visualizations; every former chart will remain.'}`,
        label: 'Restore dashboard', command });
    } catch (error) { this.patch(session.key, { message: message(error) }); }
  }
  requestDiscard(): void {
    const session = this.session();
    if (!session || this.saving() || session.outcome?.state === 'refresh-required') return;
    if (!this.needsProtection()) { this.discard(); return; }
    this.confirmation.set({ key: session.key, revision: session.revision, kind: 'discard', title: 'Discard Home changes?',
      detail: `Discard this draft for ${this.home.ownerName()}. Saved dashboards and visualizations will remain.`, label: 'Discard draft' });
  }
  async confirm(): Promise<void> {
    const confirmation = this.confirmation(), session = this.session();
    if (!confirmation || !session || this.saving()) return;
    if (confirmation.key !== session.key || confirmation.revision !== session.revision) { this.cancelConfirmation(); return; }
    this.confirmation.set(undefined);
    if (confirmation.kind === 'leave') {
      if (session.outcome?.state === 'refresh-required') this.receiptDeparture.set({ key: session.key, revision: session.revision, workspaceError: this.home.workspace.error() });
      else this.discard();
      this.finishLeave(true); return;
    }
    if (confirmation.kind === 'discard') { this.discard(); return; }
    this.put({ ...session, proposal: confirmation.command });
    await this.execute(session.key);
  }
  cancelConfirmation(): void { this.confirmation.set(undefined); this.finishLeave(false); }
  discard(): void {
    const session = this.current();
    if (!session || this.saving() || session.outcome?.state === 'refresh-required') return;
    this.put({ key: session.key, accountGuid: session.accountGuid, owner: session.owner, mode: 'view', revision: session.revision + 1 });
    this.focus('heading');
  }
  async resolveLeave(): Promise<boolean> {
    if (this.saving() || this.home.workspace.hasPending()) return false;
    if (!this.needsProtection()) { this.cancelConfirmation(); return true; }
    if (this.leavePromise) return this.leavePromise;
    const session = this.session()!;
    const committed = session.outcome?.state === 'refresh-required';
    this.confirmation.set({ key: session.key, revision: session.revision, kind: 'leave', title: committed ? 'Leave saved Home change pending refresh?' : 'Leave unsaved Home changes?',
      detail: committed ? 'The change is already saved. Return to this dashboard in this account to recover publication without saving again.' : `Discard this draft for ${this.home.ownerName()} and continue? Stay here to save or review it.`,
      label: committed ? 'Leave and recover later' : 'Discard and continue' });
    this.leavePromise = new Promise(resolve => this.leaveResolve = resolve);
    return this.leavePromise;
  }
  private finishLeave(allow: boolean): void { const resolve = this.leaveResolve; this.leaveResolve = undefined; this.leavePromise = undefined; resolve?.(allow); }
  retry(): Promise<void> { const session = this.session(); return session && this.canRetry() ? this.execute(session.key) : Promise.resolve(); }
  /** Account-local inbox recovery remains reachable after default redirects or dashboard deletion. */
  async recoverPublication(key: string): Promise<void> {
    const session = this.sessions().get(key), command = session?.proposal;
    if (!session || !command || session.outcome?.state !== 'refresh-required' || !this.canRecoverPublication()
      || command.accountGuid !== this.home.workspace.account()?.guid) return;
    const navigationEpoch = this.navigationEpoch, viewEpoch = this.viewEpoch;
    this.patch(key, { saving: true, message: undefined });
    try {
      await this.commands.recover(command.accountGuid, command.operationGuid);
      this.complete(key, 'Saved change refreshed.');
      this.publicationNotice.set({ accountGuid: command.accountGuid, message: 'Saved Home change refreshed. Your current dashboard selection is unchanged.' });
      if (navigationEpoch === this.navigationEpoch && viewEpoch === this.viewEpoch && this.home.workspace.account()?.guid === command.accountGuid) this.focus('heading');
    } catch (error) { this.patch(key, { message: message(error) }); this.publicationNotice.set({ accountGuid: command.accountGuid, message: 'The saved Home change could not refresh. Keep it for another recovery attempt.' }); }
    finally { this.patch(key, { saving: false }); }
  }
  reviewRejected(): void {
    const session = this.session();
    if (session?.outcome?.state !== 'failed' || !this.canAct()) return;
    this.put({ ...session, proposal: undefined, outcome: undefined, message: 'Draft retained for review. Saving prepares a new proposal.' });
  }
  async loadConflict(): Promise<void> {
    const session = this.session();
    if (!session || session.outcome?.state !== 'conflict' || !this.canAct()) return;
    this.patch(session.key, { saving: true });
    try {
      const result = await this.workspaceService.reloadActiveWorkspace(false);
      if (result === 'published' && this.home.workspace.account()?.guid === session.accountGuid) this.patch(session.key, { conflictLoaded: true,
        reviewedDashboard: this.home.workspace.homeDashboards().find(record => record.guid === session.baseline?.guid), reviewedOwner: this.home.view()?.record, message: 'Saved state loaded. Review both versions before keeping the draft or discarding it.' });
    } catch (error) { this.patch(session.key, { message: message(error) }); }
    finally { this.patch(session.key, { saving: false }); }
  }
  keepReviewedDraft(): void {
    const session = this.session();
    if (!session?.conflictLoaded || !session.definition || !this.canAct() || !['edit', 'create'].includes(session.mode)) return;
    const current = session.baseline && this.home.workspace.homeDashboards().find(record => record.guid === session.baseline!.guid && record.accountId === session.accountGuid);
    if ((this.home.view()?.record?.revision ?? null) !== (session.reviewedOwner?.revision ?? null)
      || session.mode === 'edit' && current?.revision !== session.reviewedDashboard?.revision) {
      this.patch(session.key, { conflictLoaded: false, message: 'Saved state changed again. Load and review it before continuing.' }); return;
    }
    if (session.mode === 'edit' && (!current || !sameHomeOwner(homeRecordOwner(current), session.owner) || readHomeDashboard(current).state !== 'valid')) return;
    this.put({ ...session, baseline: session.reviewedDashboard, ownerRevision: session.reviewedOwner?.revision ?? null,
      proposal: undefined, outcome: undefined, conflictLoaded: false, dirty: true, revision: session.revision + 1,
      message: 'Draft retained against the reviewed saved version. Save to replace that version’s layout and settings.' });
  }
  private async start(prepare: () => HomeCommand): Promise<void> {
    const session = this.current();
    if (!session || !this.canStart() || this.confirmation()) return;
    try { this.put({ ...session, proposal: prepare(), message: undefined }); await this.execute(session.key); }
    catch (error) { this.put({ ...session, message: message(error) }); }
  }
  private async execute(key: string): Promise<void> {
    const session = this.sessions().get(key), command = session?.proposal;
    if (!session || !command || !this.canAct() || this.key() !== key) return;
    const navigationEpoch = this.navigationEpoch, viewEpoch = this.viewEpoch;
    this.patch(key, { saving: true, message: undefined });
    try {
      const recovering = session.outcome?.state === 'refresh-required';
      if (recovering) {
        await this.commands.recover(command.accountGuid, command.operationGuid);
        this.complete(key, 'Saved change refreshed.');
        if (this.key() === key && this.navigationEpoch === navigationEpoch && this.viewEpoch === viewEpoch) this.focus('heading');
      } else {
        const outcome = await this.commands.submit(command);
        this.patch(key, { outcome });
        if (outcome.state === 'committed' || outcome.state === 'unchanged') {
          this.complete(key, 'Saved.');
          if (this.key() === key && this.navigationEpoch === navigationEpoch && this.viewEpoch === viewEpoch) {
            const guid = outcome.value.dashboard?.guid;
            if ((command.kind === 'create' || command.kind === 'duplicate') && guid) {
              const destinationKey = `${homeOwnerKey(command.accountGuid, command.owner)}:${JSON.stringify(guid)}`;
              this.put({ key: destinationKey, accountGuid: command.accountGuid, owner: command.owner, mode: 'view', revision: 0, message: 'Dashboard saved.' });
              if (!await this.router.navigate(homeDashboardRoute(command.owner, guid))) this.patch(key, { message: 'Saved. Open the dashboard from Home navigation.' });
            } else if (command.kind === 'delete') await this.router.navigate(this.home.defaultRoute(), { replaceUrl: true });
            else this.focus('heading');
          }
        } else this.patch(key, { message: outcome.state === 'refresh-required' ? 'Saved, but the workspace could not refresh. Refresh the saved change without saving again.'
          : outcome.state === 'conflict' ? 'The saved dashboard or Home choices changed. Your draft is retained. Load and review the saved version before continuing.' : 'error' in outcome ? message(outcome.error) : 'Home change could not be completed.' });
      }
    } catch (error) { this.patch(key, { message: message(error) }); }
    finally { this.patch(key, { saving: false }); }
  }
  private complete(key: string, message: string): void {
    const session = this.sessions().get(key)!;
    this.put({ key, accountGuid: session.accountGuid, owner: session.owner, mode: 'view', revision: session.revision + 1, message });
  }
}
function readDefinition(record?: Readonly<IdbHomeDashboard>): HomeDashboardDefinition | undefined {
  const read = record && readHomeDashboard(record); return read?.state === 'valid' ? read.value : undefined;
}
function completeOrder(view: NonNullable<ReturnType<HomeContext['view']>>): string[] {
  const order = [...(view.state?.dashboardOrder ?? [])];
  return [...order, ...view.records.map(record => record.guid).filter(guid => !order.includes(guid))];
}
function message(error: unknown): string {
  if (error instanceof WorkspaceWriteError && ['persistence-failed', 'transaction-failed'].includes(error.code)) return 'The dashboard change could not be saved. Your draft is retained. Retry or review it.';
  return error instanceof Error ? error.message : 'The Home change was rejected. Your proposal is retained for review or retry.';
}
