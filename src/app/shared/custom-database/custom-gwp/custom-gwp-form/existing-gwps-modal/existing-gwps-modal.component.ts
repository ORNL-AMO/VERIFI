import { Component, EventEmitter, Output } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from 'src/app/models/globalWarmingPotentials';
import { AssessmentReportVersion } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-existing-gwps-modal',
    templateUrl: './existing-gwps-modal.component.html',
    styleUrls: ['./existing-gwps-modal.component.css'],
    standalone: false
})
export class ExistingGwpsModalComponent {
  @Output('emitClose')
  emitClose: EventEmitter<GlobalWarmingPotential> = new EventEmitter();

  globalWarmingPotentials: Array<GlobalWarmingPotential> = GlobalWarmingPotentials;
  displayModal: boolean = false;

  assessmentReportVersion: AssessmentReportVersion = 'AR6';
  constructor(private accountDbService: AccountdbService) {

  }

  ngOnInit() {
    this.assessmentReportVersion = this.accountDbService.selectedAccount.getValue().assessmentReportVersion;
    setTimeout(() => {
      this.displayModal = true;
    }, 100);
  }


  cancelSelectFuel() {
    this.emitClose.emit(undefined);
  }

  selectOption(option: GlobalWarmingPotential) {
    this.emitClose.emit(option);
  }


}
