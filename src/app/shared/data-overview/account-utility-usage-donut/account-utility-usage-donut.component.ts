import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { SourceTotal, SourceTotals } from 'src/app/calculations/dashboard-calculations/sourceTotalsClass';
import { UtilityColors } from '../../utilityColors';

@Component({
    selector: 'app-account-utility-usage-donut',
    templateUrl: './account-utility-usage-donut.component.html',
    styleUrls: ['./account-utility-usage-donut.component.css'],
    standalone: false
})
export class AccountUtilityUsageDonutComponent {
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  energyUnit: string;
  @Input()
  dataType: 'energyUse' | 'cost';


  @ViewChild('donutChart', { static: false }) donutChart: ElementRef;
  constructor(private plotlyService: PlotlyService) {

  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.accountOverviewData && !changes.accountOverviewData.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.donutChart && this.accountOverviewData) {
      let sourceTotals: Array<SourceTotal> = this.getSourceTotals(this.accountOverviewData.sourceTotals);
      if (this.accountOverviewData.sourceTotals)
        var data = [{
          values: sourceTotals.map(sTotal => { return this.getSourceValue(sTotal) }),
          labels: sourceTotals.map(sTotal => { return sTotal.sourceLabel }),
          marker: {
            colors: sourceTotals.map(sTotal => { return UtilityColors[sTotal.sourceLabel]?.color }),
            line: {
              color: '#fff',
              width: 5
            }
          },
          texttemplate: '%{label}: (%{percent:.1%})',
          textposition: 'auto',
          insidetextorientation: "horizontal",
          hovertemplate: '%{label}: %{value:,.0f} ' + this.energyUnit + ' <extra></extra>',
          hole: .5,
          type: 'pie',
          automargin: true,
          sort: false
        }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.donutChart.nativeElement, data, layout, config);
    }
  }

  getSourceTotals(sourceTotals: SourceTotals): Array<SourceTotal>{
    if(this.dataType == 'energyUse'){
      return this.getSourceTotalsEnergy(sourceTotals);
    }else if(this.dataType == 'cost'){
      return this.getSourceTotalsCost(sourceTotals);
    }
  }

  getSourceTotalsEnergy(sourceTotals: SourceTotals): Array<SourceTotal> {
    let sourceTotalsArr: Array<SourceTotal> = new Array();
    if (sourceTotals.electricity.energyUse) {
      sourceTotalsArr.push(sourceTotals.electricity);
    }
    if (sourceTotals.naturalGas.energyUse) {
      sourceTotalsArr.push(sourceTotals.naturalGas);
    }
    if (sourceTotals.otherFuels.energyUse) {
      sourceTotalsArr.push(sourceTotals.otherFuels);
    }
    if (sourceTotals.otherEnergy.energyUse) {
      sourceTotalsArr.push(sourceTotals.otherEnergy);
    }
    if (sourceTotals.waterIntake.energyUse) {
      sourceTotalsArr.push(sourceTotals.waterIntake);
    }
    if (sourceTotals.waterDischarge.energyUse) {
      sourceTotalsArr.push(sourceTotals.waterDischarge);
    }
    if (sourceTotals.other.energyUse) {
      sourceTotalsArr.push(sourceTotals.other);
    }
    return sourceTotalsArr;
  }

  getSourceTotalsCost(sourceTotals: SourceTotals): Array<SourceTotal> {
    let sourceTotalsArr: Array<SourceTotal> = new Array();
    if (sourceTotals.electricity.cost) {
      sourceTotalsArr.push(sourceTotals.electricity);
    }
    if (sourceTotals.naturalGas.cost) {
      sourceTotalsArr.push(sourceTotals.naturalGas);
    }
    if (sourceTotals.otherFuels.cost) {
      sourceTotalsArr.push(sourceTotals.otherFuels);
    }
    if (sourceTotals.otherEnergy.cost) {
      sourceTotalsArr.push(sourceTotals.otherEnergy);
    }
    if (sourceTotals.waterIntake.cost) {
      sourceTotalsArr.push(sourceTotals.waterIntake);
    }
    if (sourceTotals.waterDischarge.cost) {
      sourceTotalsArr.push(sourceTotals.waterDischarge);
    }
    if (sourceTotals.other.cost) {
      sourceTotalsArr.push(sourceTotals.other);
    }
    return sourceTotalsArr;
  }

  getSourceValue(sourceTotal: SourceTotal): number{
    if(this.dataType == 'energyUse'){
      return sourceTotal.energyUse;
    }else if(this.dataType == 'cost'){
      return sourceTotal.cost;
    }
  }
}
