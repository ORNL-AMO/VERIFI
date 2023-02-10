import { Component, Input } from '@angular/core';
import { IdbFacility } from 'src/app/models/idb';
import { getNAICS } from 'src/app/shared/form-data/naics-data';

@Component({
  selector: 'app-facility-title-page',
  templateUrl: './facility-title-page.component.html',
  styleUrls: ['./facility-title-page.component.css']
})
export class FacilityTitlePageComponent {
  @Input()
  facility: IdbFacility;

  naics: string;
  constructor() {

  }

  ngOnInit() {
    this.naics = getNAICS(this.facility);
  }

}
