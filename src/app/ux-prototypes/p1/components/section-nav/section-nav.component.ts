import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  P1AccountSummary,
  P1ContextMode,
  P1FacilitySummary,
  P1NavGroup,
  P1SectionId
} from '../../p1.models';

@Component({
  selector: 'app-p1-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.css'],
  standalone: false
})
export class P1SectionNavComponent {
  @Input() navGroups: Array<P1NavGroup> = [];
  @Input() activeDetailId = '';
  @Input() activeSection: P1SectionId = 'home';
  @Input() contextMode: P1ContextMode = 'account';
  @Input() account: P1AccountSummary;
  @Input() facility: P1FacilitySummary;
  @Input() facilities: Array<P1FacilitySummary> = [];

  @Output() detailChange = new EventEmitter<string>();
  @Output() contextChange = new EventEmitter<P1ContextMode>();
  @Output() facilityChange = new EventEmitter<string>();
}
