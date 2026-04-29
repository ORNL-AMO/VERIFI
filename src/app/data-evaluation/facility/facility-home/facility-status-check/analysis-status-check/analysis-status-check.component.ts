import { Component, Input } from '@angular/core';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';

@Component({
  selector: 'app-analysis-status-check',
  standalone: false,
  templateUrl: './analysis-status-check.component.html',
  styleUrl: './analysis-status-check.component.css'
})
export class AnalysisStatusCheckComponent {
  @Input({ required: true }) analysisStatusCheck: AnalysisStatusCheck;
  @Input({ required: true }) type: 'energy' | 'water';
}
