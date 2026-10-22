import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
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
export class AnalysisDraftSlideoutComponent implements OnChanges {
  @Input() showCategory = true;
  @Input() energyAvailable = false;
  @Input() waterAvailable = false;
  @Input() saving = false;
  @Input() error?: string;
  @Output() submitted = new EventEmitter<AnalysisCategory>();
  @Output() cancelled = new EventEmitter<void>();
  readonly category = new FormControl<AnalysisCategory>('energy', { nonNullable: true });

  ngOnChanges(): void {
    if (!this.energyAvailable && this.waterAvailable) this.category.setValue('water', { emitEvent: false });
    else if (!this.waterAvailable && this.energyAvailable) this.category.setValue('energy', { emitEvent: false });
  }

  submit(): void {
    const available = this.category.value === 'energy' ? this.energyAvailable : this.waterAvailable;
    if (available && !this.saving) this.submitted.emit(this.category.value);
  }
}
