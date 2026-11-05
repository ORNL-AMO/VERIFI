import { EnergyUseGroupSnapshotComponent } from '../energy-use-group-snapshot/energy-use-group-snapshot.component';
import { NgModule } from '@angular/core';
import { EnergyUseSnapshotComponent } from './energy-use-snapshot.component';

@NgModule({ declarations: [EnergyUseSnapshotComponent, EnergyUseGroupSnapshotComponent], exports: [EnergyUseSnapshotComponent, EnergyUseGroupSnapshotComponent] })
export class EnergyUseSnapshotModule {}
