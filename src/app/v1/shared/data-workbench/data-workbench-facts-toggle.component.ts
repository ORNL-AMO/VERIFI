import { Component, Input, inject } from '@angular/core';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';

@Component({
  selector: 'app-data-workbench-facts-toggle',
  templateUrl: './data-workbench-facts-toggle.component.html',
  standalone: true
})
export class DataWorkbenchFactsToggleComponent {
  private readonly layout = inject(WorkbenchLayoutService);

  @Input({ required: true }) controls = '';
  @Input() buttonClass = '';
  @Input() symbolClass = '';
  readonly expanded = this.layout.factsExpanded;

  toggle(): void { this.layout.toggleFacts(); }
}
