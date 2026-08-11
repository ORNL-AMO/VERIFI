import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  P1AccountSummary,
  P1ContextMode,
  P1FacilitySummary,
  P1NavItem,
  P1SectionId,
  P1WorkspaceContent
} from '../../p1.models';

@Component({
  selector: 'app-p1-workspace-main',
  templateUrl: './workspace-main.component.html',
  styleUrls: ['./workspace-main.component.css'],
  standalone: false
})
export class P1WorkspaceMainComponent {
  @Input() content: P1WorkspaceContent;
  @Input() activeSection: P1SectionId = 'home';
  @Input() activeNavItem: P1NavItem;
  @Input() contextMode: P1ContextMode = 'account';
  @Input() account: P1AccountSummary;
  @Input() facility: P1FacilitySummary;
  @Input() facilities: Array<P1FacilitySummary> = [];
  @Input() isRightPanelOpen = true;

  @Output() rightPanelToggle = new EventEmitter<void>();
}
