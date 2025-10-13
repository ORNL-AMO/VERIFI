import { Component, ElementRef, Input, QueryList, ViewChildren } from '@angular/core';
import { AnalysisGroup, MonthlyAnalysisSummaryData, AnnualAnalysisSummary } from 'src/app/models/analysis';
import { CopyTableService } from '../../helper-services/copy-table.service';

@Component({
  selector: 'app-annual-analysis-group-savings-table',
  standalone: false,

  templateUrl: './annual-analysis-group-savings-table.component.html',
  styleUrl: './annual-analysis-group-savings-table.component.css'
})
export class AnnualAnalysisGroupSavingsTableComponent {

  @Input({ required: true })
  groupSummaries: Array<{
    group: AnalysisGroup,
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
    annualAnalysisSummaryData: Array<AnnualAnalysisSummary>
  }>;
  
  @Input({ required: true })
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;

  copyingTable: boolean = false;
  orderDataField: string = 'year';
  orderByDirection: 'asc' | 'desc' = 'asc';
  groupAnalysisData: Array<{groupId: string, data: Array<{year: number, savings: number, totalSavingsPercentImprovement: number, contributionPercent: number}>}> = [];
  @ViewChildren('savingsTable') savingsTable: QueryList<ElementRef>;

  constructor(private copyTableService: CopyTableService) { }

  ngOnInit(): void {
    this.groupSummaries.forEach(summary => {
      const grpId = summary.group.idbGroupId;
      const data = summary.annualAnalysisSummaryData.map(yearData => {
        return {
          year: yearData.year,
          savings: yearData.savings,
          totalSavingsPercentImprovement: yearData.totalSavingsPercentImprovement,
          contributionPercent: yearData.savings / this.annualAnalysisSummary.find(y => y.year == yearData.year).adjusted
        }
      });
      this.groupAnalysisData.push({ groupId: grpId, data: data });
    });
  }

  copyTable(index: number) {
    this.copyingTable = true;
    const tableRef = this.savingsTable.toArray()[index];
    setTimeout(() => {
      this.copyTableService.copyTable(tableRef);
      this.copyingTable = false;
    }, 200)
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }
}

