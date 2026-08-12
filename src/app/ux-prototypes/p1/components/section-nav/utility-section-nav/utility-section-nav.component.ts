import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';
import { utilityNavGroups } from '../section-nav-content';

@Component({
  selector: 'app-p1-utility-section-nav',
  templateUrl: './utility-section-nav.component.html',
  standalone: false
})
export class P1UtilitySectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    const nav = this.facade.data().nav[this.facade.contextMode()][this.facade.activeSection()];
    return utilityNavGroups(nav);
  }
}
