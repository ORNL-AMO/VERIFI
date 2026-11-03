import { Component, input, output } from '@angular/core';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

import { AnalysisColumnOptionsComponent, AnalysisColumnSection } from '../column-options/analysis-column-options.component';

/** Presentation only: the caller owns draft controls and decides when to save them. */
@Component({
  selector: 'app-analysis-column-picker', standalone: true,
  imports: [WorkspaceSlideoutComponent, IconComponent, AnalysisColumnOptionsComponent],
  templateUrl: './analysis-column-picker.component.html'
})
export class AnalysisColumnPickerComponent {
  readonly sections = input.required<readonly AnalysisColumnSection[]>();
  readonly description = input('');
  readonly canEdit = input(true);
  readonly closed = output<void>();
  readonly applied = output<void>();
  readonly showAllRequested = output<void>();
  readonly hideAllRequested = output<void>();
  readonly defaultsRequested = output<void>();
}
