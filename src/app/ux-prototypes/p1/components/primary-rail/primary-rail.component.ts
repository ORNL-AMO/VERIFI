import { Component, EventEmitter, Input, Output } from '@angular/core';
import { P1SectionDefinition, P1SectionId } from '../../p1.models';

@Component({
  selector: 'app-p1-primary-rail',
  templateUrl: './primary-rail.component.html',
  styleUrls: ['./primary-rail.component.css'],
  standalone: false
})
export class P1PrimaryRailComponent {
  @Input() sections: Array<P1SectionDefinition> = [];
  @Input() activeSection: P1SectionId = 'home';

  @Output() sectionChange = new EventEmitter<P1SectionId>();

  get primarySections(): Array<P1SectionDefinition> {
    return this.sections.filter(section => !section.utility);
  }

  get utilitySections(): Array<P1SectionDefinition> {
    return this.sections.filter(section => section.utility);
  }
}
