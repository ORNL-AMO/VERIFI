import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AnalysisCategory } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';

@Component({
  selector: 'app-account-analysis-draft-slideout',
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent, ReactiveFormsModule],
  templateUrl: './account-analysis-draft-slideout.component.html',
  styleUrls: ['./account-analysis-draft-slideout.component.css']
})
export class AccountAnalysisDraftSlideoutComponent {
  @Input() energyAvailable = false;
  @Input() waterAvailable = false;
  @Input() saving = false;
  @Input() error?: string;
  @Output() submitted = new EventEmitter<AnalysisCategory>();
  @Output() cancelled = new EventEmitter<void>();
  readonly category = new FormControl<AnalysisCategory>('energy', { nonNullable: true });

  submit(): void {
    const available = this.category.value === 'energy' ? this.energyAvailable : this.waterAvailable;
    if (available && !this.saving) this.submitted.emit(this.category.value);
  }
}
