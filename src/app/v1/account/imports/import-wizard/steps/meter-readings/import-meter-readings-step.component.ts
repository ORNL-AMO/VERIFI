import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import {
  ImportMeterReadingReviewMode,
  ImportMeterReadingReviewSlideoutComponent
} from './import-meter-reading-review-slideout/import-meter-reading-review-slideout.component';

@Component({
  selector: 'app-import-meter-readings-step',
  standalone: true,
  imports: [CommonModule, TooltipComponent, ImportMeterReadingReviewSlideoutComponent],
  templateUrl: './import-meter-readings-step.component.html',
  styleUrls: ['./import-meter-readings-step.component.css']
})
export class ImportMeterReadingsStepComponent {
  readonly state = inject(ImportWizardStateService);
  readonly activeReview = signal<{ meterId: string; mode: ImportMeterReadingReviewMode } | undefined>(undefined);
  readonly activeRow = computed(() => {
    const active = this.activeReview();
    return active ? this.state.meterReadingRows().find(row => row.meter.guid === active.meterId) : undefined;
  });

  openReview(meterId: string, mode: ImportMeterReadingReviewMode): void {
    this.activeReview.set({ meterId, mode });
  }

  closeReview(): void {
    this.activeReview.set(undefined);
  }
}
