import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ImportWizardStateService } from '../../import-wizard-state.service';

@Component({
  selector: 'app-import-footprint-facility-step', standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './import-footprint-facility-step.component.html',
  styleUrls: ['./import-footprint-facility-step.component.css']
})
export class ImportFootprintFacilityStepComponent {
  readonly state = inject(ImportWizardStateService);
  readonly search = new FormControl('', { nonNullable: true });
  readonly facility = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly facilities = computed(() => this.state.workspace.facilities().filter(facility => facility.accountId === this.state.workspace.account()?.guid));
  readonly matchingFacilities = computed(() => this.facilities().filter(facility => (facility.name || '').toLowerCase().includes(this.query().trim().toLowerCase())));
  constructor() {
    this.facility.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(guid => this.state.setFootprintFacility(guid));
    effect(() => this.facility.setValue(this.state.draft().selectedFacilityId || '', { emitEvent: false }));
  }
}
