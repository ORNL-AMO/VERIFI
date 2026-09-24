import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { PredictorDraft } from '../../models';

type PredictorDraftStep = 'choice' | 'standard';

@Component({
  selector: 'app-predictor-draft-slideout',
  templateUrl: './predictor-draft-slideout.component.html',
  styleUrls: ['./predictor-draft-slideout.component.css'],
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent]
})
export class PredictorDraftSlideoutComponent {
  @Input() saving = false;
  @Input() error: string | undefined;
  @Output() submitted = new EventEmitter<PredictorDraft>();
  @Output() weatherSelected = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly step = signal<PredictorDraftStep>('choice');
  readonly draft = signal<PredictorDraft>({
    name: '', production: false, predictorType: 'Standard', unit: ''
  });
  readonly isValid = computed(() => {
    const draft = this.draft();
    return draft.name.trim().length > 0
      && draft.name.trim().length <= 100
      && (!draft.unit || draft.unit.length <= 100);
  });

  chooseStandard(): void { this.step.set('standard'); }
  chooseWeather(): void { if (!this.saving) this.weatherSelected.emit(); }
  back(): void { if (!this.saving) this.step.set('choice'); }
  setName(value: string): void { this.patch({ name: value }); }
  setUnit(value: string): void { this.patch({ unit: value }); }
  setProduction(value: string): void { this.patch({ production: value === 'production' }); }

  submit(): void {
    if (this.isValid() && !this.saving) this.submitted.emit(this.draft());
  }

  private patch(update: Partial<PredictorDraft>): void {
    this.draft.update(current => ({ ...current, ...update }));
  }
}
