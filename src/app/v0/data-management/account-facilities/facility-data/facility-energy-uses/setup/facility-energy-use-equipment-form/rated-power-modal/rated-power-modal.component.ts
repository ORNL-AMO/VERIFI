import { RatedPowerCalculator } from '@shared/energy-use-calculators/rated-power-calculator';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MeterSource } from '@data/models/constantsAndTypes';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';

@Component({
  selector: 'app-rated-power-modal',
  standalone: false,
  templateUrl: './rated-power-modal.component.html',
  styleUrl: './rated-power-modal.component.css',
})
export class RatedPowerModalComponent extends RatedPowerCalculator {
  @Input({ required: true }) override energySource: MeterSource = undefined;
  @Input() override linkedMeters: Array<IdbUtilityMeter> = [];
  @Input() override initialPowerUnit: string = undefined;
  @Output() closeModal = new EventEmitter<void>();
  @Output() applyRatedPower = new EventEmitter<{ ratedPower: number; unit: string }>();
  showRatedPowerModal = true;
  constructor() { super([...inject(AccountWorkspaceStore).customFuels()]); }
  ngOnInit(): void { this.initialize(); }
  closeRatedPowerModal(): void { this.closeModal.emit(); }
  save(): void {
    if (!this.isDisabled) this.applyRatedPower.emit({ ratedPower: Number(this.calculatedRatedPower.toFixed(6)), unit: this.powerUnit });
  }
}
