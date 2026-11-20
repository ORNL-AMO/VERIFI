import { AnalysisUsageService } from '../../../used-by/analysis-usage.service';
import { Component, inject } from '@angular/core';
import { AnalysisUsedByComponent } from '../../../used-by/analysis-used-by/analysis-used-by.component';

@Component({ selector: 'app-facility-analysis-used-by', standalone: true,
  imports: [AnalysisUsedByComponent], templateUrl: './facility-analysis-used-by.component.html',
  styleUrls: ['./facility-analysis-used-by.component.css'] })
export class FacilityAnalysisUsedByComponent { readonly usage = inject(AnalysisUsageService); }
