import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from '@data/models/globalWarmingPotentials';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { globalWarmingPotentialValue } from '../custom-gwp.models';

@Component({
  selector: 'app-existing-gwp-picker',
  templateUrl: './existing-gwp-picker.component.html',
  styleUrls: ['./existing-gwp-picker.component.css'],
  standalone: false
})
export class ExistingGwpPickerComponent {
  @Input({ required: true }) assessmentReportVersion: AssessmentReportVersion = 'AR6';
  @Output() selected = new EventEmitter<GlobalWarmingPotential>();
  @Output() cancelled = new EventEmitter<void>();

  readonly query = signal('');
  readonly filteredOptions = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return GlobalWarmingPotentials
      .filter(option => !query || option.label.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  valueFor(option: GlobalWarmingPotential): number {
    return globalWarmingPotentialValue(option, this.assessmentReportVersion);
  }
}
