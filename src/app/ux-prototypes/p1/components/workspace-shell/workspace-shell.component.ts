import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  P1AccountSummary,
  P1ContextMode,
  P1FacilitySummary,
  P1NavGroup,
  P1NavItem,
  P1PanelContent,
  P1PanelTabId,
  P1SectionDefinition,
  P1SectionId,
  P1WorkspaceContent
} from '../../p1.models';

@Component({
  selector: 'app-p1-workspace-shell',
  templateUrl: './workspace-shell.component.html',
  styleUrls: ['./workspace-shell.component.css'],
  standalone: false
})
export class P1WorkspaceShellComponent {
  @Input() sections: Array<P1SectionDefinition> = [];
  @Input() activeSection: P1SectionId = 'home';
  @Input() contextMode: P1ContextMode = 'account';
  @Input() account: P1AccountSummary;
  @Input() facility: P1FacilitySummary;
  @Input() facilities: Array<P1FacilitySummary> = [];
  @Input() navGroups: Array<P1NavGroup> = [];
  @Input() activeDetailId = '';
  @Input() activeNavItem: P1NavItem;
  @Input() content: P1WorkspaceContent;
  @Input() panelContent: P1PanelContent;
  @Input() activePanelTab: P1PanelTabId = 'help';
  @Input() isRightPanelOpen = true;

  @Output() sectionChange = new EventEmitter<P1SectionId>();
  @Output() detailChange = new EventEmitter<string>();
  @Output() contextChange = new EventEmitter<P1ContextMode>();
  @Output() facilityChange = new EventEmitter<string>();
  @Output() panelTabChange = new EventEmitter<P1PanelTabId>();
  @Output() rightPanelToggle = new EventEmitter<void>();
}
