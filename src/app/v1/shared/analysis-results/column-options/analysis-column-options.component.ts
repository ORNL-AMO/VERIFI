import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface AnalysisColumnSection {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly options: readonly {
    readonly id: string;
    readonly label: string;
    readonly control: FormControl<boolean>;
    readonly usedInAnalysis?: boolean;
  }[];
}

/** The caller owns the controls and their persistence, independently of layout. */
@Component({
  selector: 'app-analysis-column-options', standalone: true,
  imports: [ReactiveFormsModule], templateUrl: './analysis-column-options.component.html',
  styleUrls: ['./analysis-column-options.component.css']
})
export class AnalysisColumnOptionsComponent {
  readonly sections = input.required<readonly AnalysisColumnSection[]>();
  readonly canEdit = input(true);
  readonly inline = input(false);
  readonly sectionActions = input(false);
  readonly defaultsLabel = input('Use Defaults');
  readonly showAllRequested = output<void>();
  readonly hideAllRequested = output<void>();
  readonly defaultsRequested = output<void>();
  readonly sectionVisibilityRequested = output<{ id: string; visible: boolean }>();
}
