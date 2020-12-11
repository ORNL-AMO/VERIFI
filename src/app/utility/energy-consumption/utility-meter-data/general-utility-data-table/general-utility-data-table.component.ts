import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';

@Component({
  selector: 'app-general-utility-data-table',
  templateUrl: './general-utility-data-table.component.html',
  styleUrls: ['./general-utility-data-table.component.css']
})
export class GeneralUtilityDataTableComponent implements OnInit {
  @Input()
  meterListItem: {
    idbMeter: IdbUtilityMeter,
    meterDataItems: Array<IdbUtilityMeterData>
  };
  @Input()
  pageSize: Array<number>;
  @Input()
  itemsPerPage: number;
  @Input()
  meterIndex: number;
  @Output('setChecked')
  setChecked: EventEmitter<boolean> = new EventEmitter<boolean>();

  allChecked: boolean;
  energyUnit: string;
  constructor(private energyUnitsHelperService: EnergyUnitsHelperService) { }

  ngOnInit(): void {
    this.energyUnit = this.energyUnitsHelperService.getEnergyUnit(this.meterListItem.idbMeter.id);
    if (this.meterListItem.meterDataItems.length != 0) {
      let hasFalseChecked: IdbUtilityMeterData = this.meterListItem.meterDataItems.find(meterDataItem => { return meterDataItem.checked == false });
      this.allChecked = (hasFalseChecked == undefined);
    }
  }

  checkAll() {
    this.meterListItem.meterDataItems.forEach(dataItem => {
      dataItem.checked = this.allChecked;
    });
    this.setChecked.emit(true);
  }

  toggleChecked() {
    this.setChecked.emit(true);
  }
}
