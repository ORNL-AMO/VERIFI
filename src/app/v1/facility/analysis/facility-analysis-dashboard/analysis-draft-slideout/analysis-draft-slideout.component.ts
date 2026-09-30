import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { AnalysisCategory } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';

@Component({
  selector: 'app-analysis-draft-slideout',
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent],
  templateUrl: './analysis-draft-slideout.component.html',
  styleUrls: ['./analysis-draft-slideout.component.css']
})
export class AnalysisDraftSlideoutComponent {
  @Input() energyAvailable = false;
  @Input() waterAvailable = false;
  @Input() saving = false;
  @Output() submitted = new EventEmitter<AnalysisCategory>();
  @Output() cancelled = new EventEmitter<void>();
  readonly category = signal<AnalysisCategory>('energy');

  setCategory(value: string): void { if (value === 'energy' || value === 'water') this.category.set(value); }
  submit(): void {
    const available = this.category() === 'energy' ? this.energyAvailable : this.waterAvailable;
    if (available && !this.saving) this.submitted.emit(this.category());
  }
}
