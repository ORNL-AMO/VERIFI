import { AnalysisUsageService } from '../../../used-by/analysis-usage.service';
import { Component, inject } from '@angular/core';
import { AnalysisUsedByComponent } from '../../../used-by/analysis-used-by/analysis-used-by.component';

@Component({ selector: 'app-account-analysis-used-by', standalone: true,
  imports: [AnalysisUsedByComponent], templateUrl: './account-analysis-used-by.component.html',
  styleUrls: ['./account-analysis-used-by.component.css'] })
export class AccountAnalysisUsedByComponent { readonly usage = inject(AnalysisUsageService); }
