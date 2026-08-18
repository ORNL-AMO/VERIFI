import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-p1-facility-analysis-workbench-footer',
  templateUrl: './workbench-footer.component.html',
  styleUrls: ['../facility-analysis-page.component.css'],
  standalone: false
})
export class P1FacilityAnalysisWorkbenchFooterComponent {
  @Input() previousLabel: string | undefined;
  @Input() nextLabel: string | undefined;
  @Input() canGoPrevious = false;
  @Input() canGoNext = false;

  @Output() goPrevious = new EventEmitter<void>();
  @Output() goNext = new EventEmitter<void>();
}
