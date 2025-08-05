import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { DataEvaluationService } from '../data-evaluation.service';

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
    private dataEvaluationService: DataEvaluationService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });
    this.activatedRoute.params.subscribe(params => {
      let facilityId: string = params['id'];
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = facilities.find(facility => { return facility.guid == facilityId });
      if (selectedFacility) {
        this.dbChangesService.selectFacility(selectedFacility);
      } else {
        this.router.navigateByUrl('/data-evaluation/account')
      }
    });

    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.printSub.unsubscribe();
  }
}
