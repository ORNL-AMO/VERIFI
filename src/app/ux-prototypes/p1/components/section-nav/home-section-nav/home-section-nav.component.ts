import { Component, inject } from '@angular/core';
import { P1NavGroup } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-home-section-nav',
  templateUrl: './home-section-nav.component.html',
  standalone: false
})
export class P1HomeSectionNavComponent {
  readonly facade = inject(P1RouteFacade);

  get groups(): Array<P1NavGroup> {
    if (this.facade.contextMode() === 'facility') {
      return [{
        title: 'Facility Workspace',
        items: [
          { id: 'overview', label: 'Overview' },
          { id: 'todo-list', label: 'Todo List' },
          { id: 'goal-progress', label: 'Goal Progress' }
        ]
      }];
    }

    return [{
      title: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview' },
        { id: 'todo-list', label: 'Todo List' },
        { id: 'goal-progress', label: 'Goal Progress' },
      ]
    }];
  }
}
