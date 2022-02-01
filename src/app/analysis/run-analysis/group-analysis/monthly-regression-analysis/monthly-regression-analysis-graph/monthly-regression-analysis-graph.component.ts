import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { MonthlyRegressionSummary } from 'src/app/analysis/calculations/regression-analysis.service';

@Component({
  selector: 'app-monthly-regression-analysis-graph',
  templateUrl: './monthly-regression-analysis-graph.component.html',
  styleUrls: ['./monthly-regression-analysis-graph.component.css']
})
export class MonthlyRegressionAnalysisGraphComponent implements OnInit {
  @Input()
  monthlyRegressionSummary: MonthlyRegressionSummary;

  @ViewChild('monthlyAnalysisGraph', { static: false }) monthlyAnalysisGraph: ElementRef;
  constructor(private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

}
