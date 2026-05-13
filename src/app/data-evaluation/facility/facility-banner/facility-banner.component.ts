import { ChangeDetectorRef, Component, computed, ElementRef, HostListener, inject, Signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';

@Component({
  selector: 'app-facility-banner',
  templateUrl: './facility-banner.component.html',
  styleUrls: ['./facility-banner.component.css'],
  standalone: false
})
export class FacilityBannerComponent {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  @ViewChild('navTabs') navTabs: ElementRef;

  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  disableTabs: Signal<boolean> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    return facilityStatusCheck ? facilityStatusCheck.hasNoMeterData : true;
  });

  hasUtilityDataWarning: Signal<boolean> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!facilityStatusCheck) return false;
    return facilityStatusCheck.metersStatus != 'good' || facilityStatusCheck.predictorsStatus != 'good';
  });

  hasAnalysisWarning: Signal<boolean> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!facilityStatusCheck) return false;
    return facilityStatusCheck.energyAnalysisStatusCheck.status != 'good' || facilityStatusCheck.waterAnalysisStatusCheck.status != 'good';
  });

  hideTabText: boolean = false;
  hideAllText: boolean = false;

  ngAfterViewInit() {
    this.setHideTabText();
    this.cd.detectChanges();
  }

  setHideTabText() {
    this.hideTabText = this.navTabs.nativeElement.offsetWidth < 750;
    this.hideAllText = this.navTabs.nativeElement.offsetWidth < 550;
  }


  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setHideTabText();
  }
}
