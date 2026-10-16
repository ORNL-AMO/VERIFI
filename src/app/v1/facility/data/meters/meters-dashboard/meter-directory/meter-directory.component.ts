import { Component, DestroyRef, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterDirectoryActionRequest, MeterDirectoryEntry } from '../meters-dashboard.view';

@Component({
  selector: 'app-meter-directory', standalone: true,
  imports: [ReactiveFormsModule, IconComponent, NgbDropdownModule, NgbTooltipModule],
  templateUrl: './meter-directory.component.html', styleUrls: ['./meter-directory.component.css']
})
export class MeterDirectoryComponent {
  readonly entries = input.required<readonly MeterDirectoryEntry[]>();
  readonly selecting = input(false);
  readonly selected = input<readonly string[]>([]);
  readonly canAct = input(false);
  readonly roundedBottom = input(false);
  readonly twoColumns = input(false);
  readonly action = output<MeterDirectoryActionRequest>();
  readonly selectionChanged = output<{ guid: string; selected: boolean }>();
  readonly emphasized = output<string | undefined>();
  readonly selectionForm = new FormRecord<FormControl<boolean>>({});
  private readonly subscriptions = new Map<string, Subscription>();
  readonly rows = computed(() => this.entries().map(entry => ({ ...entry,
    guid: entry.card.meter.guid, descriptionId: `meter-coverage-${entry.card.meter.guid}`,
    tooltip: `${entry.card.meter.name}: ${entry.coverage}`
  })));

  leaveRow(event: FocusEvent): void {
    const row = event.currentTarget as HTMLElement;
    if (!row.contains(event.relatedTarget as Node | null)) this.emphasized.emit(undefined);
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscriptions.forEach(subscription => subscription.unsubscribe()));
    effect(() => {
      const entries = this.entries();
      const current = new Set(entries.map(entry => entry.card.meter.guid));
      for (const guid of Object.keys(this.selectionForm.controls)) if (!current.has(guid)) {
        this.subscriptions.get(guid)?.unsubscribe();
        this.subscriptions.delete(guid);
        this.selectionForm.removeControl(guid, { emitEvent: false });
      }
      for (const guid of current) {
        if (!this.selectionForm.controls[guid]) {
          const control = new FormControl(false, { nonNullable: true });
          this.selectionForm.addControl(guid, control, { emitEvent: false });
          this.subscriptions.set(guid, control.valueChanges.subscribe(selected => this.selectionChanged.emit({ guid, selected })));
        }
        this.selectionForm.controls[guid].setValue(this.selected().includes(guid), { emitEvent: false });
      }
      if (this.canAct()) this.selectionForm.enable({ emitEvent: false });
      else this.selectionForm.disable({ emitEvent: false });
    });
  }
}
