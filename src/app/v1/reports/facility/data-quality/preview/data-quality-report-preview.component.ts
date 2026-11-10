import { Component } from '@angular/core';
import { DATA_QUALITY_PDF_UNAVAILABLE } from '../data-quality-report-output';

@Component({
  selector: 'app-data-quality-report-preview',
  standalone: false,
  templateUrl: './data-quality-report-preview.component.html',
  styleUrls: ['./data-quality-report-preview.component.css']
})
export class DataQualityReportPreviewComponent {
  readonly pdfUnavailableReason = DATA_QUALITY_PDF_UNAVAILABLE;
}
