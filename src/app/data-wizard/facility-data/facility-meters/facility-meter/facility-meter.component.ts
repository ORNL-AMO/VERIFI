import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { EditMeterFormService } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-meter',
  templateUrl: './facility-meter.component.html',
  styleUrl: './facility-meter.component.css'
})
export class FacilityMeterComponent {

  facility: IdbFacility;
  facilitySub: Subscription;


  utilityMeter: IdbUtilityMeter;
  meterForm: FormGroup;
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService,
    private editMeterFormService: EditMeterFormService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private router: Router
  ) {

  }

  ngOnInit() {
    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    });

    this.activatedRoute.params.subscribe(params => {
      let meterId: string = params['id'];
      this.utilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterId);
      if (this.utilityMeter) {
        this.meterForm = this.editMeterFormService.getFormFromMeter(this.utilityMeter);
        this.subscribeChanges();
      } else {
        this.router.navigateByUrl('/verifi')
      }
    });
  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
  }

  async subscribeChanges() {
    this.meterForm.valueChanges.subscribe(change => {
      this.saveChanges();
    })
  }

  async saveChanges() {
    let meterToSave: IdbUtilityMeter = this.editMeterFormService.updateMeterFromForm(this.utilityMeter, this.meterForm);
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meterToSave));
    await this.utilityMeterDbService.updateWithObservable(meterToSave);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
  }

}
