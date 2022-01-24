import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { FacilityGroupSummary, FacilityYearGroupSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-analysis-graph',
  templateUrl: './facility-analysis-graph.component.html',
  styleUrls: ['./facility-analysis-graph.component.css']
})
export class FacilityAnalysisGraphComponent implements OnInit {
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  facility: IdbFacility;
  @Input()
  facilityGroupSummaries: Array<FacilityGroupSummary>;


  @ViewChild('facilityAnalysisGraph', { static: false }) facilityAnalysisGraph: ElementRef;


  constructor(private plotlyService: PlotlyService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
  }


  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.facilityAnalysisGraph) {
      let traceData = new Array();
      for (let index = 0; index < this.analysisItem.groups.length; index++) {
        let groupSummary: Array<FacilityYearGroupSummary> = new Array();
        this.facilityGroupSummaries.forEach(summary => {
          groupSummary.push(summary.yearGroupSummaries[index]);
        });
        groupSummary = groupSummary.splice(1);
        let groupName: string = this.utilityMeterGroupDbService.getGroupName(groupSummary[0].group.idbGroupId)
        traceData.push({
          x: groupSummary.map(summary => { return summary.year }),
          y: groupSummary.map(summary => { return summary.improvementContribution }),
          name: groupName,
          type: 'bar',
          width: .5,

        });
      }
      let groupSummaries = JSON.parse(JSON.stringify(this.facilityGroupSummaries));
      groupSummaries = groupSummaries.splice(1);
      traceData.push({
        x: groupSummaries.map(summary => { return summary.totals.year }),
        y: groupSummaries.map(summary => { return summary.totals.improvementContribution-.5 }),
        name: 'Total',
        type: 'bar',
        width: .5,
        showlegend: false,
        marker: {
          opacity: 0.0,
        },
        yaxis: 'y2'
      })

      traceData.push({
        x: groupSummaries.map(summary => { return summary.totals.year }),
        y: groupSummaries.map(summary => { return .5 }),
        name: 'Total',
        type: 'bar',
        width: .4,
        marker: {
          color: 'black',
        },
        yaxis: 'y2'
      })

      var layout = {
        barmode: 'stack',
        showlegend: true,
        title: {
          text: 'Annual Energy Intensity Improvement',
        },
        yaxis: {
          title: 'Energy Intensity Improvement',
          tickprefix: '%',
        },
        yaxis2: {
          overlaying: 'y',
          side: 'left',
          showgrid: false,
          zeroline: false,
          showaxis: false,
        },
        xaxis: {
          type: 'category'
        },
        clickmode: "none",
      };
      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.facilityAnalysisGraph.nativeElement, traceData, layout, config);
    }
  }

  drawWaterFallChart() {
    if (this.facilityAnalysisGraph) {

      let yData: Array<number> = new Array();
      this.facilityGroupSummaries.forEach((summary, index) => {
        if (index == 0) {
          yData.push(summary.totals.energyIntensity);
        } else {
          yData.push(summary.totals.annualEnergyIntensityChange);
        }
      });


      let eiData = [
        {
          name: "Facility Energy Intensity",
          type: "waterfall",
          orientation: "v",
          measure: this.facilityGroupSummaries.map((summary, index) => {
            if (index == 0) { return 'absolute' }
            return 'relative'
          }),
          x: this.facilityGroupSummaries.map(summary => { return summary.totals.year }),
          y: yData,
          texttemplate: 'Total: %{value:,.2f}<br>Change: %{delta:,.2f}',
          textposition: "outside"
          // connector: {
          //   mode: "between",
          //   line: {
          //     width: 4,
          //     color: "rgb(0, 0, 0)",
          //     dash: 0
          //   }
          // }
        }
      ]

      // for (let index = 0; index < this.analysisItem.groups.length; index++) {
      //   let groupYData: Array<number> = new Array();
      //   let groupName: string;
      //   this.facilityGroupSummaries.forEach((summary, summaryIndex) => {
      //     groupName = summary.yearGroupSummaries[index].group.idbGroup.name;
      //     if (summaryIndex == 0) {
      //       groupYData.push(summary.yearGroupSummaries[index].energyIntensity);
      //     } else {
      //       groupYData.push(summary.yearGroupSummaries[index].annualEnergyIntensityChange);
      //     }
      //   });
      //   eiData.push({
      //     name: groupName,
      //     type: "waterfall",
      //     orientation: "v",
      //     measure: this.facilityGroupSummaries.map(summary => { return 'relative' }),
      //     x: this.facilityGroupSummaries.map(summary => { return summary.totals.year }),
      //     y: groupYData,
      //     // text: yData,
      //     // textposition: "outside"
      //     // connector: {
      //     //   mode: "between",
      //     //   line: {
      //     //     width: 4,
      //     //     color: "rgb(0, 0, 0)",
      //     //     dash: 0
      //     //   }
      //     // }
      //   })
      // }

      let layout = {
        waterfallgroupgap: 0.5,
        title: {
          text: "Annual Energy Intensity Change"
        },
        xaxis: {
          type: "category",
          title: {
            text: "Fiscal Year"
          }
        },
        yaxis: {
          type: "linear",
          title: {
            text: "Energy Intensity"
          }
        },
        // autosize: true,
        // showlegend: true
        margin: {
          r: 75,
          l: 75,
          t: 50,
          b: 150
        }
      };
      var config = {
        responsive: true,
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
      };
      this.plotlyService.newPlot(this.facilityAnalysisGraph.nativeElement, eiData, layout, config);
    }
  }
}
