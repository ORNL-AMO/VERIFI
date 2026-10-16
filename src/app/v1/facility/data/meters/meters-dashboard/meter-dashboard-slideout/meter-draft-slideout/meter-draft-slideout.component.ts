import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { METER_SOURCES, MeterDraft, canAssignSourceToGroup } from '@app/v1/facility/data/meters/models';
import { MeterSlideoutComponent } from '@app/v1/facility/data/meters/shared/meter-slideout/meter-slideout.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-meter-draft-slideout',
  templateUrl: './meter-draft-slideout.component.html',
  styleUrls: ['./meter-draft-slideout.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, MeterSlideoutComponent, IconComponent]
})
export class MeterDraftSlideoutComponent {
  private readonly groupOptions = signal<readonly IdbUtilityMeterGroup[]>([]);
  private isSaving = false;

  @Input() set groups(value: readonly IdbUtilityMeterGroup[]) {
    this.groupOptions.set(value);
    const groupId = this.form.controls.groupId.value;
    if (groupId && !value.some(group => group.guid === groupId)) {
      this.form.controls.groupId.setValue(undefined);
    }
  }
  get groups(): readonly IdbUtilityMeterGroup[] { return this.groupOptions(); }

  @Input() set saving(value: boolean) {
    this.isSaving = value;
    if (value) { this.form.disable({ emitEvent: false }); }
    else { this.form.enable({ emitEvent: false }); }
  }
  get saving(): boolean { return this.isSaving; }

  @Input() canSubmit = true;
  @Input() error = '';
  @Output() submitted = new EventEmitter<MeterDraft>();
  @Output() cancelled = new EventEmitter<void>();

  readonly sources = METER_SOURCES;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    source: new FormControl<MeterSource>('Electricity', { nonNullable: true, validators: [Validators.required] }),
    groupId: new FormControl<string | undefined>(undefined, { nonNullable: true })
  });
  readonly draft = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), { initialValue: this.form.getRawValue() });
  readonly selectedGroup = computed(() => this.groupOptions().find(group => group.guid === this.draft().groupId));
  readonly isValid = computed(() =>
    !!this.draft().name.trim() && !!this.draft().source
    && (!this.draft().groupId || !!this.selectedGroup())
    && canAssignSourceToGroup(this.draft().source, this.selectedGroup())
  );

  constructor() {
    this.form.controls.source.valueChanges.pipe(takeUntilDestroyed()).subscribe(source => {
      const group = this.groups.find(item => item.guid === this.form.controls.groupId.value);
      if (!canAssignSourceToGroup(source, group)) {
        this.form.controls.groupId.setValue(undefined);
      }
    });
  }

  setSource(value: MeterSource): void { this.form.controls.source.setValue(value); }

  isGroupAllowed(group: IdbUtilityMeterGroup): boolean {
    return canAssignSourceToGroup(this.form.controls.source.value, group);
  }

  submit(): void {
    if (this.isValid() && this.canSubmit && !this.saving) {
      this.submitted.emit(this.form.getRawValue());
    }
  }
}
