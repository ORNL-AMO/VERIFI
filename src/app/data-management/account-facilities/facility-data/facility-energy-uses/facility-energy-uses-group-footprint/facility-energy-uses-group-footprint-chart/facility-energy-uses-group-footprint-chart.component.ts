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
      const equipmentNames = Array.from(new Set(sourceResult.annualSourceResults.flatMap(r => r.equipmentEnergyUse.map(e => e.equipmentName))));

      // Prepare traces for each equipment
      const traces = equipmentNames.map(equipmentName => {
        const y = years.map(year => {
          const yearResult = sourceResult.annualSourceResults.find(r => r.year === year);
          if (!yearResult) return 0;
          const eq = yearResult.equipmentEnergyUse.find(e => e.equipmentName === equipmentName);
          return eq ? eq.energyUse : 0;
        });
        return {
          x: years,
          y: y,
          name: equipmentName,
          stackgroup: 'one',
          mode: 'lines',
          line: { shape: 'linear', dash: undefined },
          type: 'scatter',
          hovertemplate: `${equipmentName}: %{y:.2f} ${this.facility?.energyUnit || ''}<extra></extra>`,
          marker: { color: undefined }
        };
      });

      // Prepare trace for unaccounted energy use
      const unaccountedY = years.map(year => {
        const yearResult = sourceResult.annualSourceResults.find(r => r.year === year);
        if (!yearResult) return 0;
        const total = yearResult.totalSourceEnergyUse || 0;
        const equipmentTotal = yearResult.equipmentEnergyUse.reduce((sum, e) => sum + (e.energyUse || 0), 0);
        return Math.max(0, total - equipmentTotal);
      });
      traces.push({
        x: years,
        y: unaccountedY,
        name: 'Unaccounted',
        stackgroup: 'one',
        mode: 'lines',
        line: { shape: 'linear', dash: 'dot' },
        type: 'scatter',
        hovertemplate: `Unaccounted: %{y:.2f} ${this.facility?.energyUnit || ''}<extra></extra>`,
        marker: { color: '#b0b0b0' }
      });

      const layout = {
        showlegend: true,
        title: {
          text: `${sourceResult.source}`,
        },
        yaxis: {
          title: {
            text: `Total Energy Use (${this.facility?.energyUnit || ''})`,
          },
          automargin: true,
        },
        xaxis: {
          automargin: true,
          title: {
            text: 'Year'
          },
          tickmode: 'linear',
          dtick: 1,
          tickformat: 'd',
          type: 'linear',
        },
        legend: {
          // orientation: 'h',
        },
        margin: { t: 40 },
        hovermode: 'x unified',
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
      const equipmentNames = Array.from(new Set(groupResult.annualResults.flatMap(r => r.equipmentEnergyUse.map(e => e.equipmentName))));

      // Prepare traces for each equipment
      const traces = equipmentNames.map(equipmentName => {
        const y = years.map(year => {
          const yearResult = groupResult.annualResults.find(r => r.year === year);
          if (!yearResult) return 0;
          const eq = yearResult.equipmentEnergyUse.find(e => e.equipmentName === equipmentName);
          return eq ? eq.energyUse : 0;
        });
        return {
          x: years,
          y: y,
          name: equipmentName,
          stackgroup: 'one',
          mode: 'lines',
          line: { shape: 'linear', dash: undefined },
          type: 'scatter',
          hovertemplate: `${equipmentName}: %{y:.2f} ${this.facility?.energyUnit || ''}<extra></extra>`,
          marker: { color: undefined }
        };
      });

      // Prepare trace for unaccounted energy use
      const unaccountedY = years.map(year => {
        const yearResult = groupResult.annualResults.find(r => r.year === year);
        if (!yearResult) return 0;
        const total = yearResult.includedMetersEnergyUse || 0;
        const equipmentTotal = yearResult.equipmentEnergyUse.reduce((sum, e) => sum + (e.energyUse || 0), 0);
        return Math.max(0, total - equipmentTotal);
      });
      traces.push({
        x: years,
        y: unaccountedY,
        name: 'Unaccounted',
        stackgroup: 'one',
        mode: 'lines',
        line: { shape: 'linear', dash: 'dot' },
        type: 'scatter',
        hovertemplate: `Unaccounted: %{y:.2f} ${this.facility?.energyUnit || ''}<extra></extra>`,
        marker: { color: '#b0b0b0' }
      });

      const layout = {
        showlegend: true,
        title: {
          text: `${groupResult.meterGroupName}`,
        },
        yaxis: {
          title: {
            text: `Total Energy Use (${this.facility?.energyUnit || ''})`,
          },
          automargin: true,
        },
        xaxis: {
          automargin: true,
          title: {
            text: 'Year'
          },
          tickmode: 'linear',
          dtick: 1,
          tickformat: 'd',
          type: 'linear',
        },
        legend: {
          // orientation: 'h',
        },
        margin: { t: 40 },
        hovermode: 'x unified',
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
