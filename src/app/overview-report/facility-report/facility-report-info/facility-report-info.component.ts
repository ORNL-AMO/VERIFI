import { Component, Input, OnInit } from '@angular/core';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/form-data/naics-data';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-report-info',
  templateUrl: './facility-report-info.component.html',
  styleUrls: ['./facility-report-info.component.css']
})
export class FacilityReportInfoComponent implements OnInit {
  @Input()
  facility: IdbFacility;

  naics: string;
  constructor() { }

  ngOnInit(): void {
    this.setNAICS();
  }


  setNAICS() {
    let matchingNAICS: NAICS;
    if (this.facility.naics3) {
      matchingNAICS = ThirdNaicsList.find(item => { return item.code == this.facility.naics3 });
    } else if (this.facility.naics2) {
      matchingNAICS = SecondNaicsList.find(item => { return item.code == this.facility.naics2 });
    } else if (this.facility.naics1) {
      matchingNAICS = FirstNaicsList.find(item => { return item.code == this.facility.naics1 });
    }

    if (matchingNAICS) {
      this.naics = matchingNAICS.code + ' - ' + matchingNAICS.industryType;
    }
  }
}
