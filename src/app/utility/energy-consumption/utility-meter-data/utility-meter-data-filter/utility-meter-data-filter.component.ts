import { Component, Input, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilter } from 'src/app/models/electricityFilter';
import { IdbFacility } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-utility-meter-data-filter',
  templateUrl: './utility-meter-data-filter.component.html',
  styleUrls: ['./utility-meter-data-filter.component.css', '../utility-meter-data.component.css']
})
export class UtilityMeterDataFilterComponent implements OnInit {
  @Input()
  filterType: string;

  electricityDataFilters: Array<ElectricityDataFilter>;
  showFilterDropdown: boolean = false;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {

  }

  toggleFilterMenu() {
    if (this.showFilterDropdown == false) {
      if (this.filterType == 'table') {
        this.electricityDataFilters = this.utilityMeterDataService.tableElectricityFilters.getValue();
      } else {
        this.electricityDataFilters = this.utilityMeterDataService.electricityInputFilters.getValue();
      }
    }
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  save() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.filterType == 'table') {
      selectedFacility.tableElectricityFilters = this.electricityDataFilters;
    } else {
      selectedFacility.electricityInputFilters = this.electricityDataFilters;
    }
    this.facilityDbService.update(selectedFacility);
  }


  showAllColumns() {
    this.electricityDataFilters.forEach(electricityDataFilter => {
      electricityDataFilter.filter = true;
    });
    this.save();
  }
}
