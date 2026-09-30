import { Component, computed, inject } from '@angular/core';
import { ColumnTarget } from '@data/import/spreadsheet-import.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { IMPORT_COLUMN_TARGETS } from '../../import-column.models';
import { ImportWizardStateService } from '../../import-wizard-state.service';
import { ImportColumnLaneComponent } from './import-column-lane/import-column-lane.component';

@Component({
  selector: 'app-import-columns-step',
  standalone: true,
  imports: [IconComponent, ImportColumnLaneComponent],
  templateUrl: './import-columns-step.component.html',
  styleUrls: ['./import-columns-step.component.css']
})
export class ImportColumnsStepComponent {
  readonly state = inject(ImportWizardStateService);
  readonly dropListIds = IMPORT_COLUMN_TARGETS.map(target =>
    `import-column-${target.replace(/\s+/g, '-').toLocaleLowerCase()}`);
  readonly invalidDateRows = computed(() => this.state.columnStepStatus().date.invalidRows.join(', '));

  move(itemId: string, target: ColumnTarget): void {
    this.state.moveColumns([itemId], target);
  }
}
