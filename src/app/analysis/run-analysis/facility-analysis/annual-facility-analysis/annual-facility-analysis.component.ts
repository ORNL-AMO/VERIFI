import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';

@Component({
  selector: 'app-annual-facility-analysis',
  templateUrl: './annual-facility-analysis.component.html',
  styleUrls: ['./annual-facility-analysis.component.css']
})
export class AnnualFacilityAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
