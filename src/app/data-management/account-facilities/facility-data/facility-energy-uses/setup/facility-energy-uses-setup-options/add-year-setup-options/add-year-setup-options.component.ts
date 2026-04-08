import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityEnergyUsesSetupService } from '../../facility-energy-uses-setup.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-add-year-setup-options',
  standalone: false,
  templateUrl: './add-year-setup-options.component.html',
  styleUrl: './add-year-setup-options.component.css',
})
export class AddYearSetupOptionsComponent {
  facility: IdbFacility;
  facilitySub: Subscription;

  facilityEnergyUseGroups: Array<{
    guid: string,
    name: string,
    selected: boolean
  }>;
  facilityEnergyUseGroupsSub: Subscription;
  setupYear: number;
  yearOptions: Array<number>;

  constructor(private facilityDbService: FacilitydbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private router: Router,
    private facilityEnergyUsesSetupService: FacilityEnergyUsesSetupService,
    private route: ActivatedRoute,
    private utilityMeterDataDbService: UtilityMeterDatadbService
  ) { }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
      this.setYearOptions();
    });

    this.facilityEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.subscribe(groups => {
      this.facilityEnergyUseGroups = groups.map(group => {
        return {
          guid: group.guid,
          name: group.name,
          selected: true
        }
      });
    });
  }

  ngOnDestroy() {
    this.facilityEnergyUseGroupsSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }

  toggleGroupSelection(group: { guid: string, name: string, selected: boolean }) {
    group.selected = !group.selected;
  }

  async goToEquipmentDetails() {
    this.facilityEnergyUsesSetupService.existingGroupsToEdit = this.facilityEnergyUseGroups.filter(group => group.selected).map(group => group.guid);
    this.router.navigate(['../../modify-annual-data', this.setupYear], { relativeTo: this.route });
  }

  leaveGroupSetup() {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  setYearOptions() {
    this.yearOptions = new Array();
    let facilityMeterDataYears: { endYear: number, startYear: number } = this.utilityMeterDataDbService.getStartEndYearsForFacility(this.facility.guid);
    for (let year = facilityMeterDataYears.startYear; year <= facilityMeterDataYears.endYear; year++) {
      this.yearOptions.push(year);
    }
    if (!this.setupYear) {
      this.setupYear = this.yearOptions[this.yearOptions.length - 1];
    }
  }
}
