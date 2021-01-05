import { Injectable } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { FuelTypeOption, OtherEnergyOptions } from 'src/app/utility/energy-consumption/energy-source/edit-meter-form/editMeterOptions';

@Injectable({
  providedIn: 'root'
})
export class EnergyUnitsHelperService {

  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService) { }

  getEnergyUnit(meterId: number): string {
    let facilityMeter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterId);
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (facilityMeter.source == 'Electricity') {
      return selectedFacility.energyUnit;
    } else if (facilityMeter.source == 'Natural Gas') {
      return selectedFacility.volumeGasUnit;
    } else if (facilityMeter.source == 'Other Fuels') {
      if (facilityMeter.phase == 'Gas') {
        return selectedFacility.volumeGasUnit;
      } else if (facilityMeter.phase == 'Liquid') {
        return selectedFacility.volumeLiquidUnit;
      } else if (facilityMeter.phase == 'Solid') {
        return selectedFacility.massUnit;
      }
    } else if (facilityMeter.source == 'Water' || facilityMeter.source == 'Waste Water') {
      return selectedFacility.volumeLiquidUnit;
    } else if (facilityMeter.source == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = JSON.parse(JSON.stringify(OtherEnergyOptions.find(option => { return option.value == facilityMeter.fuel })));
      if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return selectedFacility.massUnit;
      } else if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        return selectedFacility.chilledWaterUnit;
      }
    }
  }
}
