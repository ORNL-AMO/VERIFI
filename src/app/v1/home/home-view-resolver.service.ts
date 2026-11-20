import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { readHomeDashboard } from '@data/home/home-record';
import { homeDashboardVisible, homeOwnerResolutionState } from '@data/home/home-references';
import { HomeDashboardReference, HomeOwner } from '@domain/home/home-dashboard';
import { homeViewKey, resolveHomeViews } from '@domain/home/home-views';
import { homeDashboardRoute, homeBuiltInRoute } from '@app/v1/routing/workspace-route';
import { HomeTemplateCatalog } from './home-template-catalog.service';

export const homeEntryKey = (reference: HomeDashboardReference) => reference.kind === 'saved' ? reference.dashboardGuid : homeViewKey(reference);

/** Shared read-only policy for explicit routes, owner defaults and validated chart returns. */
@Injectable({ providedIn: 'root' })
export class HomeViewResolver {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commands = inject(HomeCommands);
  private readonly catalog = inject(HomeTemplateCatalog);
  resolve(owner: HomeOwner) {
    const view = this.commands.ownerView(owner), snapshot = this.workspace.snapshot();
    if (!snapshot) return { view, choices: [], entries: [], default: undefined };
    const saved = view.records.map(record => {
      const read = readHomeDashboard(record);
      const reference: HomeDashboardReference = read.state === 'valid' && read.value.builtIn && view.state?.views?.catalog.some(ref => homeViewKey(ref) === homeViewKey(read.value.builtIn!)) ? read.value.builtIn : { kind: 'saved', dashboardGuid: record.guid };
      return { reference, record, read, name: read.state === 'valid' ? read.value.name : 'Unavailable dashboard',
        available: read.state === 'valid', visible: read.state !== 'valid' || homeDashboardVisible(record, { account: snapshot.account, meters: snapshot.meters }) };
    });
    const shipped = this.catalog.builtInViews(snapshot.account.guid, owner).map(item => ({ ...item, record: undefined,
      read: { state: 'valid' as const, value: item.definition }, name: item.definition.name, available: true,
      visible: item.definition.visibility === 'always' || item.definition.visibility === 'emissions' && !!snapshot.account.displayEmissions
        || item.definition.visibility === 'water' && snapshot.meters.some(meter => meter.accountId === snapshot.account.guid
          && (owner.kind === 'account' || meter.facilityId === owner.guid) && ['Water Intake', 'Water Discharge'].includes(meter.source)) }));
    const uniqueSaved = saved.filter((item, index) => saved.findIndex(other => homeViewKey(other.reference) === homeViewKey(item.reference)) === index).map(item => {
      if (saved.filter(other => homeViewKey(other.reference) === homeViewKey(item.reference)).length === 1) return item;
      return { ...item, read: { state: 'unsupported' as const, message: 'Several imported customizations claim this shipped view. Their records are preserved; review the backup before choosing one.' }, available: false };
    });
    const candidates = [...uniqueSaved, ...shipped.filter(item => !saved.some(record => homeViewKey(record.reference) === homeViewKey(item.reference)))];
    const state = view.record && view.state ? homeOwnerResolutionState(view.record, view.state) : view.state;
    for (const reference of state?.views?.catalog ?? []) if (!candidates.some(item => homeViewKey(item.reference) === homeViewKey(reference))) {
      candidates.push({ reference, record: undefined, read: { state: 'unsupported', message: 'This shipped dashboard version is unavailable. Its preferences are preserved.' },
        name: 'Unavailable dashboard', available: false, visible: true });
    }
    const resolved = resolveHomeViews({ initialization: view.initialization as 'new' | 'legacy' | 'initialized' | 'unavailable',
      preferences: state?.views, candidates, legacyOrder: state?.dashboardOrder ?? [], legacyDefault: state?.defaultDashboardGuid,
      deletedStarters: state?.deletedStarters ?? [] });
    const choices = resolved.entries.map(item => {
      const candidate = candidates.find(candidate => candidate === item)!;
      const key = homeEntryKey(candidate.reference);
      return { ...candidate, key, route: candidate.reference.kind === 'saved' ? homeDashboardRoute(owner, candidate.reference.dashboardGuid)
        : homeBuiltInRoute(owner, candidate.reference.template, candidate.reference.version) };
    });
    const entries = choices.filter(item => item.visible && !state?.views?.hidden.some(ref => homeViewKey(ref) === homeViewKey(item.reference)));
    return { view, choices, entries, default: resolved.default };
  }
}
