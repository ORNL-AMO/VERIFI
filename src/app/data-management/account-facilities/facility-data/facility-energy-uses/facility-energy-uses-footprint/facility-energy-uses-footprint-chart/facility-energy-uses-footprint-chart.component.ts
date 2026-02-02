import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { EnergyFootprintFacility } from 'src/app/calculations/energy-footprint/energyFootprintFacility';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-footprint-chart',
  standalone: false,
  templateUrl: './facility-energy-uses-footprint-chart.component.html',
  styleUrl: './facility-energy-uses-footprint-chart.component.css',
})
export class FacilityEnergyUsesFootprintChartComponent {
  @Input({ required: true })
  energyFootprintFacility: EnergyFootprintFacility;
  @Input({ required: true })
  facility: IdbFacility;
  @Input({ required: true })
  chartType: 'source' | 'meterGroup';
  @Input()
  groupId: string;
  @Input()
  source: MeterSource;


  @ViewChild('summaryChart', { static: false }) summaryChart: ElementRef;

  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['energyFootprintFacility'] && !changes['energyFootprintFacility'].firstChange) {
      this.drawChart();
    }
    if (changes['chartType'] && !changes['chartType'].firstChange) {
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
    if (this.summaryChart && this.energyFootprintFacility) {
      let sourceResult = this.energyFootprintFacility.includedSourcesAnnualResults.find(s => s.source == this.source);
      if (!sourceResult) { return; }

      // Ensure years are sorted and unique integers
      const years = (sourceResult.annualTotals?.map(t => t.year) || []).sort((a, b) => a - b);
      // Prepare traces for each group (horizontal bar)
      const traces = sourceResult.groupResults.map(equipmentSummary => {
        const x = years.map(year => {
          const yearResult = equipmentSummary.annualSourceResults.find(r => r.year === year);
          if (!yearResult) return 0;
          const totalEquipmentUse = yearResult.equipmentEnergyUse.reduce((sum, e) => sum + (e.energyUse || 0), 0);
          return totalEquipmentUse;
        });
        return {
          y: years.map(y => y.toString()),
          x: x,
          name: equipmentSummary.groupName,
          orientation: 'h',
          type: 'bar',
          marker: { color: equipmentSummary.color || undefined },
          hovertemplate: `%{x:,.0f} ${this.facility?.energyUnit || ''} - ${equipmentSummary.groupName}<extra></extra>`,
          visible: undefined
        };
      });

      // Prepare trace for unaccounted energy use
      const unaccountedX = years.map(year => {
        const yearResult = sourceResult.annualTotals.find(r => r.year === year);
        if (!yearResult) return 0;
        const total = yearResult.totalFacilityEnergyUse || 0;
        const equipmentTotal = yearResult.totalEquipmentEnergyUse || 0;
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
          text: `${this.source} Energy Use by Equipment Group`,
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
    if (this.summaryChart && this.energyFootprintFacility) {
      let groupResult = this.energyFootprintFacility.meterGroupsAnnualResults.find(g => g.meterGroupId == this.groupId);
      if (!groupResult) { return; }

      // Ensure years are sorted and unique integers
      const years = (groupResult.annualResults?.map(t => t.year) || []).sort((a, b) => a - b);
      // Prepare traces for each group (horizontal bar)
      const traces = groupResult.energyUseGroupAnnualResults.map(equipmentSummary => {
        const x = years.map(year => {
          const yearResult = equipmentSummary.annualResults.find(r => r.year === year);
          if (!yearResult) return 0;
          return yearResult.energyUse || 0;
        });
        return {
          y: years.map(y => y.toString()),
          x: x,
          name: equipmentSummary.groupName,
          orientation: 'h',
          type: 'bar',
          marker: { color: equipmentSummary.color || undefined },
          hovertemplate: `%{x:,.0f} ${this.facility?.energyUnit || ''} - ${equipmentSummary.groupName}<extra></extra>`,
          visible: undefined
        };
      });

      // Prepare trace for unaccounted energy use
      const unaccountedX = years.map(year => {
        const yearResult = groupResult.annualResults.find(r => r.year === year);
        if (!yearResult) return 0;
        const total = yearResult.includedMetersEnergyUse || 0;
        const equipmentTotal = yearResult.totalEquipmentEnergyUse || 0;
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
          text: `${groupResult.meterGroupName} Energy Use by Equipment Group`,
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
