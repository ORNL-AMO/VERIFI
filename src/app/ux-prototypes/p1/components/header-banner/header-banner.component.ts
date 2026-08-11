import { Component, EventEmitter, Input, Output } from '@angular/core';
import { P1AccountSummary, P1ContextMode, P1FacilitySummary } from '../../p1.models';

@Component({
  selector: 'app-p1-header-banner',
  templateUrl: './header-banner.component.html',
  styleUrls: ['./header-banner.component.css'],
  standalone: false
})
export class P1HeaderBannerComponent {
  @Input() account: P1AccountSummary;
  @Input() facility: P1FacilitySummary;
  @Input() facilities: Array<P1FacilitySummary> = [];
  @Input() contextMode: P1ContextMode = 'account';
  @Input() isWorkspaceOpen = false;

  @Output() welcomeRequested = new EventEmitter<void>();
  @Output() workspaceRequested = new EventEmitter<void>();
  @Output() contextChange = new EventEmitter<P1ContextMode>();
  @Output() facilityChange = new EventEmitter<string>();
}
