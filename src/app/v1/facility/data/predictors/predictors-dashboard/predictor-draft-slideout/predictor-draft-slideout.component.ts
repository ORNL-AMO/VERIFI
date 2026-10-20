import { Component, EventEmitter, Input, Output, OnChanges, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { PredictorDraft } from '../../models';

type PredictorDraftStep = 'choice' | 'standard';

@Component({
  selector: 'app-predictor-draft-slideout',
  templateUrl: './predictor-draft-slideout.component.html',
  styleUrls: ['./predictor-draft-slideout.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, WorkspaceSlideoutComponent]
})
export class PredictorDraftSlideoutComponent implements OnChanges {
  @Input() canSubmit = true;
  @Input() saving = false;
  @Input() error: string | undefined;
  @Output() submitted = new EventEmitter<PredictorDraft>();
  @Output() weatherSelected = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  readonly step = signal<PredictorDraftStep>('choice');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    production: new FormControl(false, { nonNullable: true }),
    unit: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] })
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly draft = computed<PredictorDraft>(() => ({ name: this.value().name ?? '', production: this.value().production ?? false,
    unit: this.value().unit ?? '', predictorType: 'Standard' }));
  readonly isValid = computed(() => this.draft().name.trim().length > 0 && this.draft().name.trim().length <= 100 && (this.draft().unit?.length ?? 0) <= 100);
  ngOnChanges(): void { if (this.saving) this.form.disable({ emitEvent: false }); else this.form.enable({ emitEvent: false }); }

  chooseStandard(): void { this.step.set('standard'); }
  chooseWeather(): void { if (!this.saving && this.canSubmit) this.weatherSelected.emit(); }
  back(): void { if (!this.saving) this.step.set('choice'); }

  submit(): void {
    if (this.isValid() && !this.saving && this.canSubmit) this.submitted.emit(this.draft());
  }

}
