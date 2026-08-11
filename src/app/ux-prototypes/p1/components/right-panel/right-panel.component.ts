import { Component, EventEmitter, Input, Output } from '@angular/core';
import { P1ContextMode, P1PanelContent, P1PanelTabId, P1SectionId } from '../../p1.models';

interface P1PanelTab {
  id: P1PanelTabId;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-p1-right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.css'],
  standalone: false
})
export class P1RightPanelComponent {
  @Input() panelContent: P1PanelContent;
  @Input() activePanelTab: P1PanelTabId = 'help';
  @Input() contextMode: P1ContextMode = 'account';
  @Input() activeSection: P1SectionId = 'home';

  @Output() panelTabChange = new EventEmitter<P1PanelTabId>();
  @Output() rightPanelToggle = new EventEmitter<void>();

  readonly tabs: Array<P1PanelTab> = [
    { id: 'help', label: 'Help', icon: 'fa-circle-question' },
    { id: 'todos', label: 'Todos', icon: 'fa-list-check' },
    { id: 'results', label: 'Results', icon: 'fa-gauge-high' },
    { id: 'details', label: 'Details', icon: 'fa-table-list' }
  ];
}
