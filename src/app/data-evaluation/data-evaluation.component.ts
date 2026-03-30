import { Component, HostListener } from '@angular/core';
import { DataEvaluationService } from './data-evaluation.service';
import { Subscription } from 'rxjs';
import { CalanderizationService } from '../shared/helper-services/calanderization.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from '../models/calanderization';
import { getCalanderizedMeterData } from '../calculations/calanderization/calanderizeMeters';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';

@Component({
  selector: 'app-data-evaluation',
  standalone: false,
  templateUrl: './data-evaluation.component.html',
  styleUrl: './data-evaluation.component.css'
})
export class DataEvaluationComponent {

  sidebarWidth: number;
  helpWidth: number;
  contentWidth: number;
  startingCursorX: number;
  isDraggingSidebar: boolean = false;
  isDraggingHelp: boolean = false;
  sidebarCollapsed: boolean = false;
  print: boolean = false;
  printSub: Subscription;

  meterDataSub: Subscription;
  constructor(
    private dataEvaluationService: DataEvaluationService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService
  ) {

  }

  ngOnInit() {
    this.sidebarWidth = this.dataEvaluationService.sidebarWidth;
    this.helpWidth = this.dataEvaluationService.helpWidth;
    this.setContentWidth();
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
    this.meterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(meterData => {
      if (meterData) {
        this.setCalanderizedMeterData(meterData);
      }
    });
  }

  ngOnDestroy() {
    this.dataEvaluationService.sidebarWidth = this.sidebarWidth;
    this.dataEvaluationService.helpWidth = this.helpWidth;
    this.dataEvaluationService.fileReferences.next([]);
    this.printSub.unsubscribe();
  }

  startResizingSidebar(event: MouseEvent): void {
    this.startingCursorX = event.clientX;
    this.isDraggingSidebar = true;
  }

  startResizingHelp(event: MouseEvent): void {
    this.startingCursorX = event.clientX;
    this.isDraggingHelp = true;
  }

  stopResizing($event: MouseEvent) {
    this.isDraggingSidebar = false;
    this.isDraggingHelp = false;
    this.dataEvaluationService.setHelpWidth(this.helpWidth);
    this.dataEvaluationService.setSidebarWidth(this.sidebarWidth);
  }

  drag(event: MouseEvent) {
    if (this.isDraggingSidebar) {
      if (event.clientX > 70) {
        this.sidebarWidth = event.clientX;
        this.dataEvaluationService.sidebarOpen.next(true);
      } else {
        this.sidebarWidth = 70;
        this.dataEvaluationService.sidebarOpen.next(false);
      }
      this.setContentWidth();
    }
    if (this.isDraggingHelp) {
      let helpWidth: number = (window.innerWidth - event.clientX)
      if (helpWidth > 50) {
        this.helpWidth = helpWidth;
        this.dataEvaluationService.helpPanelOpen.next(true);
      } else {
        this.helpWidth = 50;
        this.dataEvaluationService.helpPanelOpen.next(false);
      }
      this.setContentWidth();
    }
  }


  toggleCollapseSidebar(sidebarOpen: boolean) {
    this.dataEvaluationService.sidebarOpen.next(sidebarOpen);
    if (sidebarOpen) {
      this.sidebarWidth = 260;
    } else {
      this.sidebarWidth = 70;
    }
    this.setContentWidth();
  }

  toggleCollapseHelp(helpPanelOpen: boolean) {
    this.dataEvaluationService.helpPanelOpen.next(helpPanelOpen);
    if (helpPanelOpen) {
      this.helpWidth = 200;
    } else {
      this.helpWidth = 50;
    }
    this.dataEvaluationService.setHelpWidth(this.helpWidth);
    this.setContentWidth();
  }

  setContentWidth() {
    let contentWidth: number = (window.innerWidth - this.helpWidth - this.sidebarWidth);
    if (contentWidth < 600) {
      this.contentWidth = 600;
    } else {
      this.contentWidth = contentWidth;
    }
    this.dataEvaluationService.helpWidthBs.next(this.helpWidth);
    this.dataEvaluationService.sidebarWidthBs.next(this.sidebarWidth);
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setContentWidth();
  }

  setCalanderizedMeterData(meterData: Array<IdbUtilityMeterData>) {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, account, false, undefined, [], [], accountFacilities, account.assessmentReportVersion, []);
    this.calanderizationService.calanderizedMeters.next(calanderizedMeters);
  }
}
