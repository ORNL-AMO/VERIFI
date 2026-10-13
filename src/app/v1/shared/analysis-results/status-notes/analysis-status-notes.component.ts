import { Component, input, output } from '@angular/core';
import { StatusItem } from '@app/v1/status/status.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-analysis-status-notes',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './analysis-status-notes.component.html',
  styleUrls: ['./analysis-status-notes.component.css']
})
export class AnalysisStatusNotesComponent {
  readonly findings = input.required<readonly StatusItem[]>();
  readonly label = input('Analysis status items');
  readonly reviewed = output<StatusItem>();
}
