import { Component, Input, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-nav-list',
  templateUrl: './nav-list.component.html',
  styleUrls: ['./nav-list.component.css'],
  standalone: false
})
export class P1NavListComponent {
  @Input({ required: true }) groups: Array<P1NavGroup> = [];

  readonly facade = inject(P1RouteFacade);

  navLink(detailId: string): Array<string> {
    const section = this.facade.activeSection();
    const panelTab = this.facade.activePanelTab();
    if (this.facade.contextMode() === 'facility') {
      const facilityId = this.facade.selectedFacility()?.id;
      return facilityId
        ? ['/p1', 'workspace', 'facility', facilityId, section, detailId, panelTab]
        : ['/p1', 'workspace', 'account', section, detailId, panelTab];
    }
    return ['/p1', 'workspace', 'account', section, detailId, panelTab];
  }
}
