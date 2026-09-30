import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TooltipComponent } from '@app/v1/shared/tooltip/tooltip.component';
import { ImportPredictorReviewStateService } from '../../import-predictor-review-state.service';
import {
  ImportPredictorReadingReviewMode,
  ImportPredictorReadingReviewSlideoutComponent
} from './import-predictor-reading-review-slideout/import-predictor-reading-review-slideout.component';

@Component({
  selector: 'app-import-predictor-readings-step',
  standalone: true,
  imports: [CommonModule, TooltipComponent, ImportPredictorReadingReviewSlideoutComponent],
  templateUrl: './import-predictor-readings-step.component.html',
  styleUrls: ['./import-predictor-readings-step.component.css']
})
export class ImportPredictorReadingsStepComponent {
  readonly state = inject(ImportPredictorReviewStateService);
  readonly activeReview = signal<{ predictorId: string; mode: ImportPredictorReadingReviewMode } | undefined>(undefined);
  readonly activeRow = computed(() => {
    const active = this.activeReview();
    return active
      ? this.state.readingRows().find(row => row.predictor.guid === active.predictorId)
      : undefined;
  });

  openReview(predictorId: string, mode: ImportPredictorReadingReviewMode): void {
    this.activeReview.set({ predictorId, mode });
  }

  closeReview(): void {
    this.activeReview.set(undefined);
  }
}
