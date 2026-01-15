import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-facility-banner',
  templateUrl: './facility-banner.component.html',
  styleUrls: ['./facility-banner.component.css'],
  standalone: false
})
export class FacilityBannerComponent implements OnInit {

  @ViewChild('navTabs') navTabs: ElementRef;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  facilityMeterData: Array<IdbUtilityMeterData>;
  facilityMeterDataSub: Subscription;

  hideTabText: boolean = false;
  hideAllText: boolean = false;
  constructor(private facilityDbService: FacilitydbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(val => {
      this.facilityMeterData = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
  }

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
