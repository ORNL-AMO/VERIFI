import { Component, computed, effect, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AnalysisCategory } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';

export interface AnalysisDraftFacility {
  readonly guid: string;
  readonly name: string;
  readonly energyAvailable: boolean;
  readonly waterAvailable: boolean;
}

export type AnalysisDraftRequest =
  | { readonly scope: 'account'; readonly category: AnalysisCategory }
  | { readonly scope: 'facility'; readonly category: AnalysisCategory; readonly facilityGuid: string };

@Component({
  selector: 'app-analysis-draft-slideout',
  standalone: true,
  imports: [IconComponent, WorkspaceSlideoutComponent, ReactiveFormsModule],
  templateUrl: './analysis-draft-slideout.component.html',
  styleUrls: ['./analysis-draft-slideout.component.css']
})
export class AnalysisDraftSlideoutComponent {
  readonly energyAvailable = input(false);
  readonly waterAvailable = input(false);
  readonly fixedFacilityGuid = input<string>();
  readonly facilities = input<readonly AnalysisDraftFacility[]>([]);
  readonly showCategory = input(true);
  readonly saving = input(false);
  readonly error = input<string>();
  readonly submitted = output<AnalysisDraftRequest>();
  readonly cancelled = output<void>();
  readonly form = new FormGroup({
    scope: new FormControl<'account' | 'facility'>('account', { nonNullable: true }),
    facilityGuid: new FormControl<string | null>(null),
    category: new FormControl<AnalysisCategory>('energy', { nonNullable: true })
  });
  readonly category = this.form.controls.category;
  private readonly scopeValue = toSignal(this.form.controls.scope.valueChanges, { initialValue: this.form.controls.scope.value });
  private readonly facilityGuid = toSignal(this.form.controls.facilityGuid.valueChanges, { initialValue: this.form.controls.facilityGuid.value });
  readonly scope = computed(() => this.fixedFacilityGuid() ? 'facility' : this.scopeValue());
  readonly selectedFacility = computed(() => this.facilities().find(facility => facility.guid === (this.fixedFacilityGuid() ?? this.facilityGuid())));
  readonly availability = computed(() => this.scope() === 'account'
    ? { energy: this.energyAvailable(), water: this.waterAvailable() }
    : { energy: this.selectedFacility()?.energyAvailable ?? false, water: this.selectedFacility()?.waterAvailable ?? false });
  readonly unavailableMessage = computed(() => {
    const availability = this.availability();
    if (availability.energy || availability.water) return undefined;
    if (this.scope() === 'account') return 'Create a facility analysis before adding an account analysis.';
    if (!this.facilities().length) return 'Add a facility before creating a facility analysis.';
    return this.selectedFacility() ? 'Create a meter group for this facility before adding an analysis.' : undefined;
  });

  constructor() {
    effect(() => { const guid = this.fixedFacilityGuid(); if (guid) this.form.patchValue({ scope: 'facility', facilityGuid: guid }, { emitEvent: false }); });
    effect(() => {
      const availability = this.availability();
      if (!(this.category.value === 'energy' ? availability.energy : availability.water) && (availability.energy || availability.water)) {
        this.category.setValue(availability.energy ? 'energy' : 'water', { emitEvent: false });
      }
    });
    effect(() => {
      if (this.saving()) this.form.disable({ emitEvent: false });
      else { this.form.enable({ emitEvent: false }); if (this.fixedFacilityGuid()) { this.form.controls.scope.disable({ emitEvent: false }); this.form.controls.facilityGuid.disable({ emitEvent: false }); } }
    });
  }

  submit(): void {
    const { category } = this.form.getRawValue();
    const scope = this.scope(), facilityGuid = this.selectedFacility()?.guid;
    const availability = this.availability();
    if (this.saving() || !(category === 'energy' ? availability.energy : availability.water)) return;
    if (scope === 'account') this.submitted.emit({ scope, category });
    else if (facilityGuid && this.selectedFacility()) this.submitted.emit({ scope, category, facilityGuid });
  }
}
