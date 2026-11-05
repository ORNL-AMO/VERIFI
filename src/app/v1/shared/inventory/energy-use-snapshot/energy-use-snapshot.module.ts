import { EnergyUseGroupSnapshotComponent } from '../energy-use-group-snapshot/energy-use-group-snapshot.component';
import { MeterGroupLinksComponent } from '../meter-group-links/meter-group-links.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { NgModule } from '@angular/core';
import { EnergyUseSnapshotComponent } from './energy-use-snapshot.component';

@NgModule({ imports: [IconComponent], declarations: [EnergyUseSnapshotComponent, EnergyUseGroupSnapshotComponent, MeterGroupLinksComponent], exports: [EnergyUseSnapshotComponent, EnergyUseGroupSnapshotComponent] })
export class EnergyUseSnapshotModule {}
