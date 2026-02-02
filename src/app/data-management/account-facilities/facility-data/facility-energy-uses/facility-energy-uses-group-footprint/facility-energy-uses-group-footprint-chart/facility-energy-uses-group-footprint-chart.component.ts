import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { EnergyFootprintGroup } from 'src/app/calculations/energy-footprint/energyFootprintGroup';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-group-footprint-chart',
  standalone: false,
  templateUrl: './facility-energy-uses-group-footprint-chart.component.html',
  styleUrl: './facility-energy-uses-group-footprint-chart.component.css',
})
export class FacilityEnergyUsesGroupFootprintChartComponent {
  @Input({ required: true })
  energyFootprintGroup: EnergyFootprintGroup;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  chartType: 'source' | 'meterGroup';
  @Input()
  source: MeterSource;
  @Input()
  groupId: string;

  @ViewChild('summaryChart', { static: false }) summaryChart: ElementRef;

  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['energyFootprintGroup'] && !changes['energyFootprintGroup'].firstChange) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.chartType == 'source') {
      this.drawSourceChart();
    } else {
      this.drawMeterGroupChart();
    }
  }

  drawSourceChart() {
    if (this.summaryChart && this.energyFootprintGroup) {
      // Only show the first source for now (can be extended to allow user selection)
      const sources = this.energyFootprintGroup.includedSourcesAnnualResults || [];
      if (!sources.length) return;
      const sourceResult = sources.find(s => s.source === this.source);
      const years = Array.from(new Set(sourceResult.annualSourceResults.map(r => r.year))).sort((a, b) => a - b);
      const equipmentGuid = Array.from(new Set(sourceResult.annualSourceResults.flatMap(r => r.equipmentEnergyUse.map(e => e.equipmentGuid))));

      // Prepare traces for each equipment (horizontal bar)
      const traces = equipmentGuid.map(guid => {
        const x = years.map(year => {
          const yearResult = sourceResult.annualSourceResults.find(r => r.year === year);
          if (!yearResult) return 0;
          const eq = yearResult.equipmentEnergyUse.find(e => e.equipmentGuid === guid);
          return eq ? eq.energyUse : 0;
        });
        let equipment = this.energyFootprintGroup.groupEquipment.find(e => e.guid === guid);

        return {
          y: years.map(y => y.toString()),
          x: x,
          name: equipment?.name || 'Unknown',
          orientation: 'h',
          type: 'bar',
          marker: { color: equipment?.color || undefined },
          hovertemplate: `%{x:,.0f} ${this.facility?.energyUnit || ''} - ${equipment?.name || 'Unknown'}<extra></extra>`,
          visible: undefined
        };
      });

      // Prepare trace for unaccounted energy use
      const unaccountedX = years.map(year => {
        const yearResult = sourceResult.annualSourceResults.find(r => r.year === year);
        if (!yearResult) return 0;
        const total = yearResult.totalSourceEnergyUse || 0;
        const equipmentTotal = yearResult.equipmentEnergyUse.reduce((sum, e) => sum + (e.energyUse || 0), 0);
        return Math.max(0, total - equipmentTotal);
      });
      traces.push({
        y: years.map(y => y.toString()),
        x: unaccountedX,
        name: 'Unaccounted',
        orientation: 'h',
        type: 'bar',
        marker: { color: '#b0b0b0' },
        hovertemplate: `%{x:,.0f} ${this.facility?.energyUnit || ''} - Unaccounted<extra></extra>`,
        visible: 'legendonly',
      });

       const layout = {
        barmode: 'stack',
        showlegend: true,
        title: {
          text: `${this.source} Energy Use by Equipment`,
        },
        xaxis: {
          title: {
            text: `Total Energy Use (${this.facility?.energyUnit || ''})`,
          },
          automargin: true,
        },
        yaxis: {
          automargin: true,
          title: {
            text: 'Year',
          },
          type: 'category',
        },
        legend: {
          // orientation: 'h',
        },
        margin: { t: 40 },
        hovermode: 'y unified',
      };
      const config = {
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.summaryChart.nativeElement, traces, layout, config);
    }
  }

  drawMeterGroupChart() {

    if (this.summaryChart && this.energyFootprintGroup) {
      // Only show the selected meter group (by groupId)
      const meterGroups = this.energyFootprintGroup.meterGroupsAnnualResults || [];
      if (!meterGroups.length) return;
      const groupResult = meterGroups.find(g => g.meterGroupId === this.groupId);
      if (!groupResult) return;
      const years = Array.from(new Set(groupResult.annualResults.map(r => r.year))).sort((a, b) => a - b);
      const equipmentGuids = Array.from(new Set(groupResult.annualResults.flatMap(r => r.equipmentEnergyUse.map(e => e.equipmentGuid))));

      // Prepare traces for each equipment (horizontal bar)
      const traces = equipmentGuids.map(guid => {
        const x = years.map(year => {
          const yearResult = groupResult.annualResults.find(r => r.year === year);
          if (!yearResult) return 0;
          const eq = yearResult.equipmentEnergyUse.find(e => e.equipmentGuid === guid);
          return eq ? eq.energyUse : 0;
        });
        let equipment = this.energyFootprintGroup.groupEquipment.find(e => e.guid === guid);
        return {
          y: years.map(y => y.toString()),
          x: x,
          name: equipment?.name || 'Unknown',
          orientation: 'h',
          type: 'bar',
          marker: { color: undefined },
          hovertemplate: `%{x:,.0f} ${this.facility?.energyUnit || ''} - ${equipment?.name || 'Unknown'}<extra></extra>`,
          visible: undefined
        };
      });

      // Prepare trace for unaccounted energy use
      const unaccountedX = years.map(year => {
        const yearResult = groupResult.annualResults.find(r => r.year === year);
        if (!yearResult) return 0;
        const total = yearResult.includedMetersEnergyUse || 0;
        const equipmentTotal = yearResult.equipmentEnergyUse.reduce((sum, e) => sum + (e.energyUse || 0), 0);
        return Math.max(0, total - equipmentTotal);
      });
      traces.push({
        y: years.map(y => y.toString()),
        x: unaccountedX,
        name: 'Unaccounted',
        orientation: 'h',
        type: 'bar',
        marker: { color: '#b0b0b0' },
        hovertemplate: `%{x:,.0f} ${this.facility?.energyUnit || ''} - Unaccounted<extra></extra>`,
        visible: 'legendonly',
      });

      const layout = {
        barmode: 'stack',
        showlegend: true,
        title: {
          text: `${groupResult.meterGroupName} Energy Use by Equipment`,
        },
        xaxis: {
          title: {
            text: `Total Energy Use (${this.facility?.energyUnit || ''})`,
          },
          automargin: true,
        },
        yaxis: {
          automargin: true,
          title: {
            text: 'Year',
          },
          type: 'category',
        },
        legend: {
          // orientation: 'h',
        },
        margin: { t: 40 },
        hovermode: 'y unified',
      };
      const config = {
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.summaryChart.nativeElement, traces, layout, config);
    }

  }
}
