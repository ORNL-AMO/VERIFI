import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-data',
  templateUrl: './facility-data.component.html',
  styleUrl: './facility-data.component.css',
  standalone: false
})
export class FacilityDataComponent {


  constructor(private activatedRoute: ActivatedRoute,
    private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private router: Router
  ) {

  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let facilityId: string = params['id'];
      let selectedFacility: IdbFacility = this.facilityDbService.getFacilityById(facilityId);
      if (selectedFacility) {
        this.dbChangesService.selectFacility(selectedFacility);
      } else {
        this.router.navigateByUrl('/welcome')
      }
    });
  }

}
