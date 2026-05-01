import { Component, computed, ElementRef, inject, Input, OnChanges, OnDestroy, signal, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { EnergyFootprintAnnualEquipmentGroupSummary } from 'src/app/calculations/energy-footprint/energyBalance/energyFootprintAnnualEquipmentGroupSummary';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { SankeyData, SankeyLink, SankeyNode } from 'src/app/models/visualization';
import { buildSankeyData, formatEnergyValue, getLinkColor, getSourceColor } from 'src/app/shared/sankey-utils';

@Component({
  selector: 'app-facility-energy-uses-group-sankey',
  standalone: false,
  templateUrl: './facility-energy-uses-group-sankey.component.html',
  styleUrl: './facility-energy-uses-group-sankey.component.css',
})
export class FacilityEnergyUsesGroupSankeyComponent implements OnChanges, OnDestroy {

  @Input({ required: true })
  set energyFootprintAnnualEquipmentGroupSummary(value: EnergyFootprintAnnualEquipmentGroupSummary | null) {
    this.energyFootprintAnnualEquipmentGroupSummarySignal.set(value);
  }
  get energyFootprintAnnualEquipmentGroupSummary(): EnergyFootprintAnnualEquipmentGroupSummary | null {
    return this.energyFootprintAnnualEquipmentGroupSummarySignal();
  }

  private energyFootprintAnnualEquipmentGroupSummarySignal = signal<EnergyFootprintAnnualEquipmentGroupSummary | null>(null);

  private plotlyService = inject(PlotlyService);

  @ViewChild('footprintSankey', { static: false }) footprintSankey: ElementRef;

  // Chart configuration — static options passed to Plotly
  private readonly config = {
    responsive: true,
    displayModeBar: false,
    staticPlot: false
  };

  private readonly layout = {
    title: {
      text: 'Energy Flow by Source',
      font: { size: 16 }
    },
    font: { size: 12 },
    margin: { t: 50, l: 10, r: 10, b: 10 },
    height: 400
  };

  // Computed signal: rebuilds the Sankey data whenever the balance input changes
  private sankeyData = computed(() => {
    const balance = this.energyFootprintAnnualEquipmentGroupSummarySignal();
    if (!balance || !balance.sourcesConsumption?.length) {
      return null;
    }
    return this.transformToSankeyFormat(balance);
  });

  ngOnChanges(changes: SimpleChanges): void {
    // Re-render the chart whenever the balance or energy unit changes
    if (changes['energyFootprintAnnualEquipmentGroupSummary'] || changes['energyUnit']) {
      this.updateChart();
    }
  }

  ngAfterViewInit(): void {
    if (this.sankeyData()) {
      this.createChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  // ---------------------------------------------------------------------------
  // Sankey data transformation
  // ---------------------------------------------------------------------------

  /**
   * Transforms the group balance data into a Plotly Sankey format.
   *
   * Flow: Energy Sources (left) → Individual Equipment (right)
   *
   * - Left nodes: each distinct energy source in the group (e.g. Electricity, Natural Gas)
   * - Right nodes: each unique piece of equipment, labelled with its total energy use
   *   across all sources
   * - Links: one link per (source, equipment) pair, sized by the equipment's energy use
   *   for that source
   */
  private transformToSankeyFormat(balance: EnergyFootprintAnnualEquipmentGroupSummary): SankeyData | null {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // --- Left nodes: one per energy source ---
    const sources = balance.sourcesConsumption.filter(sc => sc.totalEquipmentEnergyUse > 0);
    if (!sources.length) return null;

    sources.forEach(sc => {
      nodes.push({
        label: `${sc.source} (${this.formatValue(sc.totalEquipmentEnergyUse)})`,
        color: getSourceColor(sc.source)
      });
    });

    // --- Right nodes: one per unique piece of equipment ---
    // Collect all equipment pieces, deduplicating by guid and summing energy across sources
    const equipmentTotalsMap = new Map<string, { equipment: IdbFacilityEnergyUseEquipment; totalEnergyUse: number }>();

    sources.forEach(sc => {
      sc.equipmentEnergyUses.forEach(eu => {
        const guid = eu.equipment.guid;
        const existing = equipmentTotalsMap.get(guid);
        if (existing) {
          existing.totalEnergyUse += eu.energyUse;
        } else {
          equipmentTotalsMap.set(guid, { equipment: eu.equipment, totalEnergyUse: eu.energyUse });
        }
      });
    });

    // Record the starting index for equipment nodes so links can reference them correctly
    const equipmentNodeStartIndex = nodes.length;
    const equipmentGuids = Array.from(equipmentTotalsMap.keys());

    equipmentTotalsMap.forEach(({ equipment, totalEnergyUse }) => {
      nodes.push({
        label: `${equipment.name} (${this.formatValue(totalEnergyUse)})`,
        // Use the equipment's assigned color for visual differentiation
        color: equipment.color
      });
    });

    // --- Links: source → equipment ---
    sources.forEach((sc, sourceIndex) => {
      sc.equipmentEnergyUses.forEach(eu => {
        if (eu.energyUse <= 0) return;

        const equipmentIndex = equipmentGuids.indexOf(eu.equipment.guid);
        if (equipmentIndex === -1) return;

        links.push({
          source: sourceIndex,
          target: equipmentNodeStartIndex + equipmentIndex,
          value: eu.energyUse,
          // Link color is derived from the source to preserve visual association
          color: getLinkColor(sc.source, false, 0.4)
        });
      });
    });

    return buildSankeyData(nodes, links);
  }

  // ---------------------------------------------------------------------------
  // Chart lifecycle helpers
  // ---------------------------------------------------------------------------

  private createChart(): void {
    if (!this.footprintSankey?.nativeElement) return;

    const data = this.sankeyData();
    if (!data) return;

    this.plotlyService.newPlot(
      this.footprintSankey.nativeElement,
      [data],
      this.layout,
      this.config
    );
  }

  private updateChart(): void {
    if (!this.footprintSankey?.nativeElement) return;

    const data = this.sankeyData();
    if (!data) {
      this.destroyChart();
      return;
    }

    this.plotlyService.newPlot(
      this.footprintSankey.nativeElement,
      [data],
      this.layout,
      this.config
    );
  }

  private destroyChart(): void {
    // Placeholder for Plotly purge when chart teardown is needed
  }

  // ---------------------------------------------------------------------------
  // Formatting helper
  // ---------------------------------------------------------------------------

  /**
   * Formats a numeric energy value using the component's current energyUnit input.
   * Delegates to the shared formatEnergyValue utility.
   */
  private formatValue(value: number): string {
    return formatEnergyValue(value, this.energyFootprintAnnualEquipmentGroupSummarySignal()?.facility.energyUnit);
  }
}
