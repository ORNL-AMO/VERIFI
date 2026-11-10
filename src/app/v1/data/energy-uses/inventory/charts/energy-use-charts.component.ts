import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, Injector, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { facilityEnergyUseGroupRoute, facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { V1EChartsPointClickEvent } from '@app/v1/shared/charts/echarts-chart.directive';
import { buildEnergyUseTreemap, energyUseChartYears, EnergyUseTreemapNode } from '../../models/energy-use-projection.models';
import { EnergyUseInventoryEntry } from '../energy-use-inventory.models';
import { EnergyUseChartSessionService } from './energy-use-chart-session.service';
import { ENERGY_USE_TREEMAP_ROOT, energyUseTreemapOption, formatTreemapPercentage } from './energy-use-treemap-chart';
import { buildEnergyUseTreemapResults, treemapUsageShares } from './energy-use-treemap-results.models';

@Component({ selector: 'app-energy-use-charts', standalone: false, templateUrl: './energy-use-charts.component.html', styleUrls: ['./energy-use-charts.component.css'] })
export class EnergyUseChartsComponent {
  readonly entries = input<readonly EnergyUseInventoryEntry[]>([]);
  readonly facilityGuid = input<string>();
  readonly groupGuid = input<string>();
  readonly ready = input(false);
  private readonly store = inject(AccountWorkspaceStore);
  private readonly sessions = inject(EnergyUseChartSessionService);
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly destroy = inject(DestroyRef);
  private portal?: TemplatePortal;
  private opener?: HTMLElement;
  @ViewChild('sheet') private readonly sheet?: TemplateRef<unknown>;
  @ViewChild('levelTitle') private readonly levelTitle?: ElementRef<HTMLElement>;
  @ViewChild('plot') private readonly plot?: ElementRef<HTMLElement>;
  readonly open = signal(false);
  readonly years = computed(() => energyUseChartYears(this.store.energyUseEquipment().filter(item =>
    item.accountId === this.store.account()?.guid && (!this.facilityGuid() || item.facilityId === this.facilityGuid())
    && (!this.groupGuid() || item.energyUseGroupId === this.groupGuid()))));
  readonly year = computed(() => this.years().at(-1));
  readonly title = computed(() => {
    const owner = this.facilityGuid() ? this.store.facilities().find(facility => facility.guid === this.facilityGuid()) : this.store.account();
    return `${owner?.name ?? 'Energy Uses'}${this.year() ? ' (' + this.year() + ')' : ''}`;
  });
  readonly nodeId = signal('');
  readonly key = computed(() => JSON.stringify([this.store.account()?.guid, this.facilityGuid(), this.groupGuid()]));
  readonly unit = computed(() => (this.facilityGuid() ? this.store.facilities().find(facility => facility.guid === this.facilityGuid()) : this.store.account())?.energyUnit ?? '');
  readonly results = computed(() => {
    const account = this.store.account(), year = this.year();
    if (!this.open() || !account || year === undefined) return undefined;
    return buildEnergyUseTreemapResults(this.store.energyUseEquipment(), this.store.facilities(), account.guid, year, this.unit());
  });
  readonly rows = computed(() => {
    const ids = new Set(this.entries().map(entry => entry.guid)), facilityGuid = this.facilityGuid();
    return this.results()?.rows.filter(row => ids.has(row.item.guid) && (!facilityGuid || row.facility.guid === facilityGuid)) ?? [];
  });
  readonly unavailable = computed(() => {
    const projected = new Set(this.rows().map(row => row.item.guid));
    return this.open() ? this.entries().filter(entry => !projected.has(entry.guid)).map(entry => ({ ...entry,
      route: facilityEnergyUseRoute(entry.facility.guid, this.itemGroup(entry.guid), entry.guid) })) : [];
  });
  readonly tree = computed(() => buildEnergyUseTreemap(this.rows(), this.store.energyUseGroups(), this.groupGuid(), this.facilityGuid()));
  readonly path = computed(() => {
    const find = (nodes: readonly EnergyUseTreemapNode[]): EnergyUseTreemapNode[] => {
      for (const node of nodes) {
        if (node.id === this.nodeId()) return [node];
        const children = find(node.children ?? []);
        if (children.length) return [node, ...children];
      }
      return [];
    };
    return this.nodeId() ? find(this.tree()).map(node => ({ ...node, name: node.kind === 'period' ? `Fiscal Year ${this.year()}` : node.name })) : [];
  });
  readonly active = computed(() => this.path().at(-1));
  readonly visible = computed(() => this.active()?.children ?? this.tree());
  readonly positive = computed(() => this.visible().some(node => node.value > 0));
  readonly partial = computed(() => this.rows().some(row => row.partial));
  readonly details = computed(() => this.rows().flatMap(row => row.sources.map(source => ({ ...source, itemName: row.item.name,
    savedAmount: source.originalAmount === undefined ? '' : Number.isFinite(source.originalAmount) ? source.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'Invalid value',
    facilityName: row.facility.name, facilityGuid: row.facility.guid, period: row.period.label,
    route: facilityEnergyUseRoute(row.facility.guid, this.itemGroup(row.item.guid), row.item.guid),
    retirement: row.item.noLongerInUse?.isNoLongerInUse ? `Retired after FY ${row.item.noLongerInUse.year}` : '' }))));
  readonly links = computed(() => {
    const results = this.results();
    return results ? this.visible().map(node => {
      const shares = treemapUsageShares(node, results);
      return { ...node, ...shares, name: node.kind === 'period' ? `Fiscal Year ${this.year()}` : node.name,
        facilityUsageLabel: shares.facilityShare === null ? null : formatTreemapPercentage(shares.facilityShare) + ' of Facility Usage',
        accountUsageLabel: shares.accountShare === null ? 'Account Usage: Unavailable' : formatTreemapPercentage(shares.accountShare) + ' of Account Usage',
        route: node.itemGuid && node.facilityGuid ? facilityEnergyUseRoute(node.facilityGuid, this.itemGroup(node.itemGuid), node.itemGuid)
          : node.groupGuid && node.facilityGuid ? facilityEnergyUseGroupRoute(node.facilityGuid, node.groupGuid) : undefined };
    }) : [];
  });
  readonly option = computed(() => {
    const results = this.results();
    return results ? energyUseTreemapOption(this.active() ? [this.active()!] : this.tree(), this.store.energyUseGroups(), this.title(), this.unit(), !!this.facilityGuid(), results) : { series: [] };
  });
  constructor() {
    let previous = '';
    effect(() => {
      const key = this.key();
      untracked(() => {
        if (previous !== key) {
          if (previous) this.sessions.save(previous, { nodeId: this.nodeId() });
          previous = key;
          const saved = this.sessions.read(key);
          this.nodeId.set(saved?.nodeId ?? '');
        }
      });
    });
    effect(() => {
      if (this.open() && this.ready() && this.nodeId() && !this.active()) untracked(() => this.nodeId.set(''));
    });
    effect(() => {
      const active = this.modal.activePortal();
      if (this.portal && active !== this.portal) untracked(() => { this.saveView(); this.portal = undefined; this.open.set(false); });
    });
    this.destroy.onDestroy(() => this.close(false));
  }
  show(): void {
    if (!this.sheet || !this.ready() || this.open()) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.open.set(true);
    this.portal = new TemplatePortal(this.sheet, this.view);
    this.modal.show(this.portal, { blockWorkspace: true });
  }
  close(restoreFocus = true): void {
    this.saveView();
    this.open.set(false);
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
    const opener = this.opener;
    if (restoreFocus && opener?.isConnected) afterNextRender(() => {
      if (!this.destroy.destroyed && !this.modal.activePortal() && opener.isConnected) opener.focus();
    }, { injector: this.injector });
  }
  private saveView(): void { this.sessions.save(this.key(), { nodeId: this.nodeId() }); }
  private itemGroup(guid: string): string {
    const item = this.entries().find(entry => entry.guid === guid)?.item;
    return this.store.energyUseGroups().some(group => group.guid === item?.energyUseGroupId && group.facilityId === item.facilityId && group.accountId === item.accountId)
      ? item!.energyUseGroupId : 'unavailable';
  }
  drill(id: string): void {
    if (!id || this.findNode(this.tree(), id)?.children?.length) {
      this.nodeId.set(id);
      afterNextRender(() => (this.plot ?? this.levelTitle)?.nativeElement.focus(), { injector: this.injector });
    }
  }
  parent(): void { this.drill(this.path().at(-2)?.id ?? ''); }
  private findNode(nodes: readonly EnergyUseTreemapNode[], id: string): EnergyUseTreemapNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      const match = this.findNode(node.children ?? [], id);
      if (match) return match;
    }
    return undefined;
  }
  clicked(event: V1EChartsPointClickEvent): void {
    const data = event.data as { id?: unknown } | undefined;
    if (data?.id === ENERGY_USE_TREEMAP_ROOT) this.drill('');
    else if (data?.id === this.nodeId()) this.parent();
    else if (typeof data?.id === 'string') this.drill(data.id);
  }
  keydown(event: KeyboardEvent): void {
    if (event.key === 'Backspace' || event.key === 'Home') {
      event.preventDefault();
      if (event.key === 'Home') this.drill(''); else this.parent();
    }
  }
}
