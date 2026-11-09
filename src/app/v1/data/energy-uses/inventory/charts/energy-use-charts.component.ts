import { TreemapSeriesOption } from 'echarts/charts';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, Injector, TemplateRef, ViewChild, ViewContainerRef, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { facilityEnergyUseGroupRoute, facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { V1EChartsOption, V1EChartsPointClickEvent } from '@app/v1/shared/charts/echarts-chart.directive';
import { buildEnergyUseTreemap, energyUseChartYears, projectEnergyUse, EnergyUseTreemapNode } from '../../models/energy-use-projection.models';
import { EnergyUseInventoryEntry } from '../energy-use-inventory.models';
import { EnergyUseChartSessionService } from './energy-use-chart-session.service';

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
  readonly open = signal(false);
  readonly yearControl = new FormControl<number | null>(null);
  private readonly yearValue = toSignal(this.yearControl.valueChanges, { initialValue: null });
  readonly years = computed(() => energyUseChartYears(this.store.energyUseEquipment()));
  readonly year = computed(() => this.yearValue() ?? this.yearControl.value ?? this.years().at(-1));
  readonly nodeId = signal('');
  readonly key = computed(() => JSON.stringify([this.store.account()?.guid, this.facilityGuid(), this.groupGuid()]));
  readonly unit = computed(() => (this.facilityGuid() ? this.store.facilities().find(facility => facility.guid === this.facilityGuid()) : this.store.account())?.energyUnit ?? '');
  readonly rows = computed(() => !this.open() || !this.year() ? [] : this.entries().flatMap(entry => {
    const row = projectEnergyUse(entry.item, entry.facility, this.year()!, this.unit()); return row ? [row] : [];
  }));
  readonly unavailable = computed(() => this.open() ? this.entries().filter(entry => !this.rows().some(row => row.item.guid === entry.guid)) : []);
  readonly tree = computed(() => buildEnergyUseTreemap(this.rows(), this.store.energyUseGroups(), this.groupGuid(), this.facilityGuid()));
  readonly nodes = computed(() => {
    const flatten = (nodes: readonly EnergyUseTreemapNode[]): EnergyUseTreemapNode[] => nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);
    return flatten(this.tree());
  });
  readonly active = computed(() => this.nodes().find(node => node.id === this.nodeId()));
  readonly visible = computed(() => this.active()?.children ?? this.tree());
  readonly details = computed(() => this.rows().flatMap(row => row.sources.map(source => ({ ...source, itemName: row.item.name,
    facilityName: row.facility.name, facilityGuid: row.facility.guid, period: row.period.label, route: facilityEnergyUseRoute(row.facility.guid, this.itemGroup(row.item.guid), row.item.guid),
    retirement: row.item.noLongerInUse?.isNoLongerInUse ? `Retired after FY ${row.item.noLongerInUse.year}` : '' }))));
  readonly links = computed(() => this.visible().map(node => ({ ...node, route: node.itemGuid && node.facilityGuid ? facilityEnergyUseRoute(node.facilityGuid, this.itemGroup(node.itemGuid), node.itemGuid)
    : node.groupGuid && node.facilityGuid ? facilityEnergyUseGroupRoute(node.facilityGuid, node.groupGuid) : undefined })));
  readonly option = computed<V1EChartsOption>(() => {
    const unit = this.unit();
    const chartNode = (node: EnergyUseTreemapNode): NonNullable<TreemapSeriesOption['data']>[number] => ({ ...node, children: node.children?.map(chartNode) });
    return { animation: false, tooltip: { renderMode: 'richText', formatter: params => {
      const data = (Array.isArray(params) ? params[0] : params).data as EnergyUseTreemapNode;
      return data?.kind ? `${data.name}\n${data.value.toLocaleString()} ${unit}\n${data.percentOfPeriod.toFixed(1)}% of this fiscal period${data.carried ? '\nIncludes carried-forward values' : ''}${data.partial ? '\nPartial coverage' : ''}` : '';
    } }, series: [{ type: 'treemap', data: this.visible().map(chartNode),
      nodeClick: false, roam: false, breadcrumb: { show: false }, leafDepth: this.active()?.kind === 'period' || this.facilityGuid() ? 2 : 3, label: { show: true, formatter: '{b}', color: 'var(--v1-text)', backgroundColor: 'var(--v1-surface)', padding: [3, 5] },
      upperLabel: { show: true, height: 24, color: 'var(--v1-text)', backgroundColor: 'var(--v1-surface)' }, itemStyle: { borderColor: 'var(--v1-border)', borderWidth: 2, gapWidth: 2 },
      color: Array.from({ length: 12 }, (_, index) => `var(--v1-chart-series-${index + 1})`) }] };
  });
  constructor() {
    let previous = '';
    effect(() => { const key = this.key(), years = this.years();
      untracked(() => {
        if (previous !== key) {
          if (previous) this.sessions.save(previous, { year: this.yearControl.value, nodeId: this.nodeId() });
          previous = key; const saved = this.sessions.read(key);
          this.yearControl.setValue(saved?.year && years.includes(saved.year) ? saved.year : years.at(-1) ?? null);
          this.nodeId.set(saved?.nodeId ?? '');
        } else if (!this.yearControl.value || !years.includes(this.yearControl.value)) this.yearControl.setValue(years.at(-1) ?? null);
      });
    });
    const sub = this.yearControl.valueChanges.subscribe(() => this.nodeId.set('')); this.destroy.onDestroy(() => sub.unsubscribe());
    effect(() => { const active = this.modal.activePortal(); if (this.portal && active !== this.portal) untracked(() => { this.portal = undefined; this.open.set(false); }); });
    this.destroy.onDestroy(() => { if (previous) this.sessions.save(previous, { year: this.yearControl.value, nodeId: this.nodeId() }); this.close(false); });
  }
  show(): void {
    if (!this.sheet || !this.ready() || this.open()) return;
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.open.set(true); this.portal = new TemplatePortal(this.sheet, this.view); this.modal.show(this.portal, { blockWorkspace: true });
  }
  close(restoreFocus = true): void {
    this.open.set(false);
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide(); this.portal = undefined;
    const opener = this.opener;
    if (restoreFocus && opener?.isConnected) afterNextRender(() => { if (!this.destroy.destroyed && !this.modal.activePortal() && opener.isConnected) opener.focus(); }, { injector: this.injector });
  }
  private itemGroup(guid: string): string {
    const item = this.entries().find(entry => entry.guid === guid)?.item;
    return this.store.energyUseGroups().some(group => group.guid === item?.energyUseGroupId && group.facilityId === item.facilityId && group.accountId === item.accountId)
      ? item!.energyUseGroupId : 'unavailable';
  }
  drill(id: string): void { const node = this.nodes().find(node => node.id === id); if (node?.children?.length) this.nodeId.set(id); }
  clicked(event: V1EChartsPointClickEvent): void {
    const data = event.data as { id?: unknown } | undefined; if (typeof data?.id === 'string') this.drill(data.id);
  }
}
