import { Component, DestroyRef, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PredictorInventoryActionRequest, PredictorInventoryEntry, PredictorInventorySort, groupPredictorInventory } from '../predictor-inventory.models';

@Component({ selector: 'app-predictor-directory', standalone: true,
  imports: [ReactiveFormsModule, IconComponent, NgbDropdownModule, NgbTooltipModule],
  templateUrl: './predictor-directory.component.html', styleUrls: ['./predictor-directory.component.css'] })
export class PredictorDirectoryComponent {
  readonly entries = input.required<readonly PredictorInventoryEntry[]>();
  readonly sort = input<PredictorInventorySort>('attention');
  readonly showPreview = input(true);
  readonly selecting = input(false);
  readonly selected = input<readonly string[]>([]);
  readonly canAct = input(false);
  readonly previewGuid = input<string>();
  readonly twoColumns = input(false);
  readonly roundedBottom = input(false);
  readonly action = output<PredictorInventoryActionRequest>();
  readonly stationOpened = output<string>();
  readonly previewSelected = output<string>();
  readonly selectionChanged = output<{ guid: string; selected: boolean }>();
  readonly groups = computed(() => groupPredictorInventory(this.entries(), this.sort()));
  readonly selectionForm = new FormRecord<FormControl<boolean>>({});
  private readonly subscriptions = new Map<string, Subscription>();
  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscriptions.forEach(subscription => subscription.unsubscribe()));
    effect(() => {
      const entries = this.entries();
      const guids = new Set(entries.map(item => item.guid));
      for (const guid of Object.keys(this.selectionForm.controls)) if (!guids.has(guid)) {
        this.subscriptions.get(guid)?.unsubscribe(); this.subscriptions.delete(guid);
        this.selectionForm.removeControl(guid, { emitEvent: false });
      }
      for (const entry of entries) {
        const guid = entry.guid;
        if (!this.selectionForm.controls[guid]) {
          const control = new FormControl(false, { nonNullable: true });
          this.selectionForm.addControl(guid, control, { emitEvent: false });
          this.subscriptions.set(guid, control.valueChanges.subscribe(selected => this.selectionChanged.emit({ guid, selected })));
        }
        const control = this.selectionForm.controls[guid];
        control.setValue(this.selected().includes(guid), { emitEvent: false });
        if (this.canAct() && entry.canDelete) control.enable({ emitEvent: false }); else control.disable({ emitEvent: false });
      }
    });
  }
}
