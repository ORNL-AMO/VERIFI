import { Component, ElementRef, inject, Input, ViewChild, OnInit, OnDestroy, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { EnergyFootprintAnnualFacilityBalance } from 'src/app/calculations/energy-footprint/energyBalance/energyFootprintAnnualFacilityBalance';
import { SankeyData, SankeyNode, SankeyLink } from 'src/app/models/visualization';

@Component({
  selector: 'app-facility-energy-uses-sankey',
  standalone: false,
  templateUrl: './facility-energy-uses-sankey.component.html',
  styleUrl: './facility-energy-uses-sankey.component.css',
})
export class FacilityEnergyUsesSankeyComponent implements OnDestroy, OnChanges {
  @Input({ required: true })
  set energyFootprintAnnualFacilityBalance(value: EnergyFootprintAnnualFacilityBalance | null) {
    this.energyFootprintAnnualFacilityBalanceSignal.set(value);
  }
  get energyFootprintAnnualFacilityBalance(): EnergyFootprintAnnualFacilityBalance | null {
    return this.energyFootprintAnnualFacilityBalanceSignal();
  }
  @Input({ required: true })
  set displayDataByGroup(value: boolean) {
    this.displayDataByGroupSignal.set(value);
  }
  get displayDataByGroup(): boolean {
    return this.displayDataByGroupSignal();
  }

  private displayDataByGroupSignal = signal<boolean>(false);

  private energyFootprintAnnualFacilityBalanceSignal = signal<EnergyFootprintAnnualFacilityBalance | null>(null);

  private plotlyService = inject(PlotlyService);

  @ViewChild('footprintSankey', { static: false }) footprintSankey: ElementRef;

  // private chartCreated = signal(false);

  // Computed signal for transformed chart data
  private sankeyData = computed(() => {
    const balance = this.energyFootprintAnnualFacilityBalanceSignal();
    const displayByGroup = this.displayDataByGroupSignal();
    
    if (!balance) {
      return null;
    }
    
    // Check if we have the required data based on display mode
    if (displayByGroup && !balance.meterGroupsAnnualBalances?.length) {
      return null;
    } else if (!displayByGroup && !balance.sourcesConsumption?.length) {
      return null;
    }

    return this.transformToSankeyFormat(balance, displayByGroup);
  });

  // Chart configuration
  private readonly config = {
    responsive: true,
    displayModeBar: false,
    staticPlot: false
  };

  private readonly layout = {
    title: {
      text: 'Energy Flow by Source and Equipment Group',
      font: { size: 16 }
    },
    font: { size: 12 },
    margin: { t: 50, l: 10, r: 10, b: 10 },
    height: 400
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['energyFootprintAnnualFacilityBalance'] || changes['displayDataByGroup']) {
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

  /**
   * Transforms EnergyFootprintAnnualFacilityBalance data into Plotly Sankey format
   * @param balance - The facility balance data
   * @param displayByGroup - If true, shows meter groups -> sources -> equipment groups flow
   *                        If false, shows sources -> equipment groups flow
   */
  private transformToSankeyFormat(balance: EnergyFootprintAnnualFacilityBalance, displayByGroup: boolean): SankeyData | null {
    if (displayByGroup) {
      return this.transformMeterGroupSankeyData(balance);
    } else {
      return this.transformFacilitySankeyData(balance);
    }
  }

  /**
   * Creates Sankey data showing facility-level flow: Sources -> Equipment Groups
   */
  private transformFacilitySankeyData(balance: EnergyFootprintAnnualFacilityBalance): SankeyData | null {
    const sources = balance.sourcesConsumption;
    if (!sources.length) return null;

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // Add source nodes (left side)
    sources.forEach(source => {
      if (source.actualEnergyUse > 0) {
        nodes.push({
          label: `${source.source} (${this.formatEnergyValue(source.actualEnergyUse)})`,
          color: this.getSourceColor(source.source)
        });
      }
    });

    // Collect all unique equipment groups and their total energy use
    const equipmentGroupMap = this.buildEquipmentGroupMap(sources);

    // Add equipment group nodes (right side)
    equipmentGroupMap.forEach(group => {
      nodes.push({
        label: `${group.name} (${this.formatEnergyValue(group.totalEnergyUse)})`,
        color: this.getEquipmentGroupColor(group.name)
      });
    });

    // Create links between sources and equipment groups
    this.createSourceToEquipmentLinks(sources, equipmentGroupMap, sources.length, links);

    return this.buildSankeyData(nodes, links);
  }

  /**
   * Creates Sankey data showing meter group flow: Meter Groups -> Sources -> Equipment Groups
   */
  private transformMeterGroupSankeyData(balance: EnergyFootprintAnnualFacilityBalance): SankeyData | null {
    const meterGroups = balance.meterGroupsAnnualBalances;
    if (!meterGroups.length) return null;

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // Add meter group nodes (left side)
    meterGroups.forEach(meterGroup => {
      const totalEnergyUse = meterGroup.getTotalEnergyUse();
      if (totalEnergyUse > 0) {
        nodes.push({
          label: `${meterGroup.meterGroup.name} (${this.formatEnergyValue(totalEnergyUse)})`,
          color: '#4682B4' // Default color for meter groups
        });
      }
    });

    // Collect unique sources across all meter groups
    const allSources = this.collectAllSourcesFromMeterGroups(meterGroups);
    const sourceNodeStartIndex = nodes.length;

    // Add source nodes (middle)
    allSources.forEach(source => {
      nodes.push({
        label: `${source.source} (${this.formatEnergyValue(source.totalEnergyUse)})`,
        color: this.getSourceColor(source.source)
      });
    });

    // Collect all equipment groups across all meter groups
    const allEquipmentGroups = this.collectAllEquipmentGroupsFromMeterGroups(meterGroups);
    const equipmentGroupStartIndex = sourceNodeStartIndex + allSources.length;

    // Add equipment group nodes (right side)
    allEquipmentGroups.forEach(group => {
      nodes.push({
        label: `${group.name} (${this.formatEnergyValue(group.totalEnergyUse)})`,
        color: this.getEquipmentGroupColor(group.name)
      });
    });

    // Create links: meter groups -> sources
    this.createMeterGroupToSourceLinks(meterGroups, allSources, sourceNodeStartIndex, links);

    // Create links: sources -> equipment groups  
    this.createSourceToEquipmentLinksFromMeterGroups(meterGroups, allSources, allEquipmentGroups, sourceNodeStartIndex, equipmentGroupStartIndex, links);

    return this.buildSankeyData(nodes, links);
  }

  /**
   * Builds equipment group map from sources consumption data
   */
  private buildEquipmentGroupMap(sources: any[]): Map<string, { name: string; totalEnergyUse: number }> {
    const equipmentGroupMap = new Map<string, { name: string; totalEnergyUse: number }>();

    sources.forEach(source => {
      // Add equipment groups
      source.equipmentGroupEnergyUses.forEach(groupUse => {
        const groupId = groupUse.energyUseGroup.guid;
        const existing = equipmentGroupMap.get(groupId);
        if (existing) {
          existing.totalEnergyUse += groupUse.energyUse;
        } else {
          equipmentGroupMap.set(groupId, {
            name: groupUse.energyUseGroup.name,
            totalEnergyUse: groupUse.energyUse
          });
        }
      });

      // Add unaccounted energy if significant
      if (source.unaccountedEnergyUse > 0.01) {
        const unaccountedId = `unaccounted-${source.source}`;
        equipmentGroupMap.set(unaccountedId, {
          name: 'Unaccounted',
          totalEnergyUse: source.unaccountedEnergyUse
        });
      }
    });

    return equipmentGroupMap;
  }

  /**
   * Creates links between sources and equipment groups
   */
  private createSourceToEquipmentLinks(sources: any[], equipmentGroupMap: Map<string, any>, equipmentGroupStartIndex: number, links: SankeyLink[]): void {
    const equipmentGroupIds = Array.from(equipmentGroupMap.keys());

    sources.forEach((source, sourceIndex) => {
      // Links to equipment groups
      source.equipmentGroupEnergyUses.forEach(groupUse => {
        const groupIndex = equipmentGroupIds.indexOf(groupUse.energyUseGroup.guid);
        if (groupIndex !== -1 && groupUse.energyUse > 0) {
          links.push({
            source: sourceIndex,
            target: equipmentGroupStartIndex + groupIndex,
            value: groupUse.energyUse,
            color: this.getLinkColor(source.source)
          });
        }
      });

      // Link to unaccounted energy if exists
      if (source.unaccountedEnergyUse > 0.01) {
        const unaccountedId = `unaccounted-${source.source}`;
        const unaccountedIndex = equipmentGroupIds.indexOf(unaccountedId);
        if (unaccountedIndex !== -1) {
          links.push({
            source: sourceIndex,
            target: equipmentGroupStartIndex + unaccountedIndex,
            value: source.unaccountedEnergyUse,
            color: this.getLinkColor(source.source, true)
          });
        }
      }
    });
  }

  /**
   * Collects all unique sources from meter groups with their total energy use
   */
  private collectAllSourcesFromMeterGroups(meterGroups: any[]): Array<{ source: string; totalEnergyUse: number }> {
    const sourceMap = new Map<string, number>();

    meterGroups.forEach(meterGroup => {
      meterGroup.sourcesConsumption.forEach(source => {
        const existing = sourceMap.get(source.source) || 0;
        sourceMap.set(source.source, existing + source.actualEnergyUse);
      });
    });

    return Array.from(sourceMap.entries()).map(([source, totalEnergyUse]) => ({
      source,
      totalEnergyUse
    }));
  }

  /**
   * Collects all unique equipment groups from meter groups with their total energy use
   */
  private collectAllEquipmentGroupsFromMeterGroups(meterGroups: any[]): Array<{ name: string; guid: string; totalEnergyUse: number }> {
    const equipmentGroupMap = new Map<string, { name: string; totalEnergyUse: number }>();

    meterGroups.forEach(meterGroup => {
      meterGroup.sourcesConsumption.forEach(source => {
        source.equipmentGroupEnergyUses.forEach(groupUse => {
          const groupId = groupUse.energyUseGroup.guid;
          const existing = equipmentGroupMap.get(groupId);
          if (existing) {
            existing.totalEnergyUse += groupUse.energyUse;
          } else {
            equipmentGroupMap.set(groupId, {
              name: groupUse.energyUseGroup.name,
              totalEnergyUse: groupUse.energyUse
            });
          }
        });

        // Add unaccounted energy if significant
        if (source.unaccountedEnergyUse > 0.01) {
          const unaccountedId = `unaccounted-${source.source}`;
          const existing = equipmentGroupMap.get(unaccountedId);
          if (existing) {
            existing.totalEnergyUse += source.unaccountedEnergyUse;
          } else {
            equipmentGroupMap.set(unaccountedId, {
              name: 'Unaccounted',
              totalEnergyUse: source.unaccountedEnergyUse
            });
          }
        }
      });
    });

    return Array.from(equipmentGroupMap.entries()).map(([guid, data]) => ({
      name: data.name,
      guid,
      totalEnergyUse: data.totalEnergyUse
    }));
  }

  /**
   * Creates links between meter groups and sources
   */
  private createMeterGroupToSourceLinks(meterGroups: any[], allSources: any[], sourceNodeStartIndex: number, links: SankeyLink[]): void {
    meterGroups.forEach((meterGroup, meterGroupIndex) => {
      meterGroup.sourcesConsumption.forEach(source => {
        const sourceIndex = allSources.findIndex(s => s.source === source.source);
        if (sourceIndex !== -1 && source.actualEnergyUse > 0) {
          links.push({
            source: meterGroupIndex,
            target: sourceNodeStartIndex + sourceIndex,
            value: source.actualEnergyUse,
            color: this.getLinkColor(source.source, false, 0.3)
          });
        }
      });
    });
  }

  /**
   * Creates links between sources and equipment groups for meter group display
   */
  private createSourceToEquipmentLinksFromMeterGroups(meterGroups: any[], allSources: any[], allEquipmentGroups: any[], sourceNodeStartIndex: number, equipmentGroupStartIndex: number, links: SankeyLink[]): void {
    // Create a map to track energy flow from each source to each equipment group
    const sourceToEquipmentFlow = new Map<string, Map<string, number>>();

    meterGroups.forEach(meterGroup => {
      meterGroup.sourcesConsumption.forEach(source => {
        const sourceKey = source.source;
        if (!sourceToEquipmentFlow.has(sourceKey)) {
          sourceToEquipmentFlow.set(sourceKey, new Map());
        }
        const equipmentMap = sourceToEquipmentFlow.get(sourceKey)!;

        source.equipmentGroupEnergyUses.forEach(groupUse => {
          const groupKey = groupUse.energyUseGroup.guid;
          const existing = equipmentMap.get(groupKey) || 0;
          equipmentMap.set(groupKey, existing + groupUse.energyUse);
        });

        // Handle unaccounted energy
        if (source.unaccountedEnergyUse > 0.01) {
          const unaccountedKey = `unaccounted-${source.source}`;
          const existing = equipmentMap.get(unaccountedKey) || 0;
          equipmentMap.set(unaccountedKey, existing + source.unaccountedEnergyUse);
        }
      });
    });

    // Create links from aggregated flow data
    sourceToEquipmentFlow.forEach((equipmentMap, sourceKey) => {
      const sourceIndex = allSources.findIndex(s => s.source === sourceKey);
      if (sourceIndex !== -1) {
        equipmentMap.forEach((energyUse, equipmentKey) => {
          const equipmentIndex = allEquipmentGroups.findIndex(g => g.guid === equipmentKey);
          if (equipmentIndex !== -1 && energyUse > 0) {
            links.push({
              source: sourceNodeStartIndex + sourceIndex,
              target: equipmentGroupStartIndex + equipmentIndex,
              value: energyUse,
              color: this.getLinkColor(sourceKey, equipmentKey.startsWith('unaccounted'))
            });
          }
        });
      }
    });
  }

  /**
   * Builds the final SankeyData object
   */
  private buildSankeyData(nodes: SankeyNode[], links: SankeyLink[]): SankeyData {
    return {
      type: 'sankey',
      node: {
        pad: 15,
        thickness: 20,
        line: { color: '#333', width: 0.5 },
        label: nodes.map(n => n.label),
        color: nodes.map(n => n.color)
      },
      link: {
        source: links.map(l => l.source),
        target: links.map(l => l.target),
        value: links.map(l => l.value),
        color: links.map(l => l.color)
      }
    };
  }


  private createChart(): void {
    if (!this.footprintSankey?.nativeElement) return;

    const data = this.sankeyData();
    if (!data) return;

    this.plotlyService.newPlot(
      this.footprintSankey.nativeElement,
      [data],
      this.layout,
      this.config
    )
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
    // if (this.footprintSankey?.nativeElement && this.chartCreated()) {
    //   //TODO double check workflow
    //   // this.plotlyService.purge(this.footprintSankey.nativeElement);
    //   this.chartCreated.set(false);
    // }
  }

  private formatEnergyValue(value: number): string {
    const unit = this.energyFootprintAnnualFacilityBalance?.facility?.energyUnit || 'MMBtu';
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${unit}`;
  }

  private getSourceColor(source: string): string {
    // Use UtilityColors mapping if available, fallback to default
    return UtilityColors[source]?.color || '#4682B4';
  }

  private getEquipmentGroupColor(groupName: string): string {
    if (groupName === 'Unaccounted') {
      return '#D3D3D3';
    }
    // Use a lighter shade for equipment groups
    const colors = ['#87CEEB', '#DDA0DD', '#F0E68C', '#98FB98', '#FFA07A', '#87CEFA', '#F5DEB3'];
    const hash = groupName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  private getLinkColor(source: string, isUnaccounted = false, customOpacity?: number): string {
    const baseColor = this.getSourceColor(source);
    const opacity = customOpacity || (isUnaccounted ? '0.2' : '0.4');
    // Convert hex to rgba
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}
