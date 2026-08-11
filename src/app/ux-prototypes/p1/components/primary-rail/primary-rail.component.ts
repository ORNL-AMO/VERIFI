import { Component, inject } from '@angular/core';
import { P1SectionDefinition, P1SectionId } from '../../p1.models';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-primary-rail',
  templateUrl: './primary-rail.component.html',
  styleUrls: ['./primary-rail.component.css'],
  standalone: false
})
export class P1PrimaryRailComponent {
  readonly facade = inject(P1RouteFacade);

  get primarySections(): Array<P1SectionDefinition> {
    return this.facade.sections().filter(section => !section.utility);
  }

  get utilitySections(): Array<P1SectionDefinition> {
    return this.facade.sections().filter(section => section.utility);
  }

  isActive(sectionId: P1SectionId): boolean {
    return this.facade.activeSection() === sectionId;
  }
}
