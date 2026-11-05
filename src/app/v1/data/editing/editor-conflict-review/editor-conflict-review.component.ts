import { TemplatePortal } from '@angular/cdk/portal';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ConflictChoice, ConflictChoices, DraftConflict, draftEqual } from '../draft-reconciliation';

let nextReview = 0;

@Component({
  selector: 'app-editor-conflict-review',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmationDialogComponent],
  templateUrl: './editor-conflict-review.component.html',
  styleUrls: ['./editor-conflict-review.component.css']
})
export class EditorConflictReviewComponent implements OnChanges, OnDestroy {
  private readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  private portal?: TemplatePortal;
  private reviewed: readonly DraftConflict[] = [];
  @Input({ required: true }) conflicts: readonly DraftConflict[] = [];
  @Input() disabled = false;
  @Output() readonly resolved = new EventEmitter<ConflictChoices>();
  @ViewChild('reviewDialog') private readonly reviewDialog?: TemplateRef<unknown>;
  readonly titleId = `data-conflict-review-${++nextReview}`;
  readonly choices = new FormRecord<FormControl<ConflictChoice | null>>({});
  rows: readonly { readonly conflict: DraftConflict; readonly local: string; readonly saved: string; readonly canKeepLocal: boolean; readonly canKeepSaved: boolean }[] = [];

  ngOnChanges(): void {
    if (this.portal && !draftEqual(this.conflicts, this.reviewed)) this.close();
    this.rows = this.conflicts.map(conflict => ({ conflict,
      local: formatConflictValue(conflict.localValue), saved: formatConflictValue(conflict.savedValue),
      canKeepLocal: !conflict.allowedChoices || conflict.allowedChoices.includes('local'), canKeepSaved: !conflict.allowedChoices || conflict.allowedChoices.includes('saved') }));
  }

  open(): void {
    if (this.disabled || !this.conflicts.length || !this.reviewDialog) return;
    Object.keys(this.choices.controls).forEach(key => this.choices.removeControl(key, { emitEvent: false }));
    this.conflicts.forEach(conflict => this.choices.addControl(conflict.id,
      new FormControl<ConflictChoice | null>(null, [Validators.required, control =>
        !conflict.allowedChoices || conflict.allowedChoices.includes(control.value) ? null : { unsupportedChoice: true }]), { emitEvent: false }));
    this.reviewed = structuredClone(this.conflicts);
    this.portal = new TemplatePortal(this.reviewDialog, this.view);
    this.modal.show(this.portal);
  }

  confirm(): void {
    if (this.disabled || this.choices.invalid || !draftEqual(this.conflicts, this.reviewed)) return;
    const choices = this.choices.getRawValue() as Record<string, ConflictChoice>;
    this.close(); this.resolved.emit(choices);
  }

  close(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined; this.reviewed = [];
  }

  ngOnDestroy(): void { this.close(); }
}

function formatConflictValue(value: unknown): string {
  if (value === undefined) return 'Removed';
  if (value === null || value === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map(formatConflictValue).join('; ') : 'None';
  if (typeof value === 'object') return Object.entries(value).filter(([key]) => key !== 'id' && !/guid$/i.test(key)).map(([key, item]) =>
    `${key.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${formatConflictValue(item)}`).join('; ');
  return String(value);
}
