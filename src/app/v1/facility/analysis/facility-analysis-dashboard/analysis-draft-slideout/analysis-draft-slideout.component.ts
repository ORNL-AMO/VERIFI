import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AnalysisCategory } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-analysis-draft-slideout',
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent, ReactiveFormsModule],
  templateUrl: './analysis-draft-slideout.component.html',
  styleUrls: ['./analysis-draft-slideout.component.css']
})
export class AnalysisDraftSlideoutComponent {
  @Input() energyAvailable = false;
  @Input() waterAvailable = false;
  @Input() saving = false;
  @Input() error?: string;
  @Output() submitted = new EventEmitter<AnalysisCategory>();
  @Output() cancelled = new EventEmitter<void>();
  readonly category = new FormControl<AnalysisCategory>('energy', { nonNullable: true });

  setCategory(category: AnalysisCategory): void { this.category.setValue(category); }

  submit(): void {
    const available = this.category.value === 'energy' ? this.energyAvailable : this.waterAvailable;
    if (available && !this.saving) this.submitted.emit(this.category.value);
  }
}
