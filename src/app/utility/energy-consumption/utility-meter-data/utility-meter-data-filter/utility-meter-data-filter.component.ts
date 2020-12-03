import { Component, OnInit } from '@angular/core';
import { ElectricityDataFilter, UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-utility-meter-data-filter',
  templateUrl: './utility-meter-data-filter.component.html',
  styleUrls: ['./utility-meter-data-filter.component.css', '../utility-meter-data.component.css']
})
export class UtilityMeterDataFilterComponent implements OnInit {

  electricityDataFilters: Array<ElectricityDataFilter>;
  showFilterDropdown: boolean = false;
  constructor(private utilityMeterDataService: UtilityMeterDataService) { }

  ngOnInit(): void {

  }

  toggleFilterMenu() {
    if (this.showFilterDropdown == false) {
      this.electricityDataFilters = this.utilityMeterDataService.electricityDataFilters.getValue();
    }
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  save() {
    this.utilityMeterDataService.electricityDataFilters.next(this.electricityDataFilters);
  }


  showAllColumns() {
    this.electricityDataFilters.forEach(electricityDataFilter => {
      electricityDataFilter.filter = true;
    });
    this.save();
  }
}
