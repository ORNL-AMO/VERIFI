import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbFacility } from '../models/idbModels/facility';
import { FacilityReportsService } from './facility-reports/facility-reports.service';

@Component({
    selector: 'app-facility',
    templateUrl: './facility.component.html',
    styleUrls: ['./facility.component.css'],
    standalone: false
})
export class FacilityComponent implements OnInit {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  print: boolean;
  printSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private facilityDbService: FacilitydbService, private router: Router,
    private dbChangesService: DbChangesService,
  private facilityReportService: FacilityReportsService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });
    this.activatedRoute.params.subscribe(params => {
      let facilityId: number = parseInt(params['id']);
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = facilities.find(facility => { return facility.id == facilityId });
      if (selectedFacility) {
        this.dbChangesService.selectFacility(selectedFacility);
      }else{
        this.router.navigateByUrl('account')
      }
    });

    this.printSub = this.facilityReportService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy(){
    this.selectedFacilitySub.unsubscribe();
    this.printSub.unsubscribe();
  }
}
