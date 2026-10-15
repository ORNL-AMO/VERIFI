import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { FacilityReportType } from '@data/models/idbModels/facilityReport';

export type ReportDraftForm = FormGroup<{
  name: FormControl<string>;
  type: FormControl<FacilityReportType>;
}>;

@Component({
  selector: 'app-report-draft-slideout',
  standalone: false,
  templateUrl: './report-draft-slideout.component.html',
  styleUrls: ['./report-draft-slideout.component.css']
})
export class ReportDraftSlideoutComponent {
  @Input({ required: true }) form!: ReportDraftForm;
  @Input({ required: true }) reportTypes!: ReadonlyArray<{ value: FacilityReportType; label: string }>;
  @Input() saving = false;
  @Input() canSave = false;
  @Input() error?: string;
  @Output() readonly submitted = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly closeRequested = new EventEmitter<void>();
}
