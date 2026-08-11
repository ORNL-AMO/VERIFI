import { Component, inject } from '@angular/core';
import { P1PanelTabId } from '../../p1.models';
import { P1RouteFacade } from '../../p1-route.facade';

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
  readonly facade = inject(P1RouteFacade);

  readonly tabs: Array<P1PanelTab> = [
    { id: 'help', label: 'Help', icon: 'fa-circle-question' },
    { id: 'todos', label: 'Todos', icon: 'fa-list-check' },
    { id: 'results', label: 'Results', icon: 'fa-gauge-high' },
    { id: 'details', label: 'Details', icon: 'fa-table-list' }
  ];
}
