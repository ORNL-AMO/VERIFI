import { Component, inject } from '@angular/core';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';

@Component({
  selector: 'app-energy-use-workbench-panel',
  templateUrl: './energy-use-workbench-panel.component.html',
  styleUrls: ['./energy-use-workbench-panel.component.css'],
  standalone: false
})
export class EnergyUseWorkbenchPanelComponent {
  readonly context = inject(EnergyUseWorkbenchContextService);
  hasUnsavedChanges(): boolean { return false; }
}
