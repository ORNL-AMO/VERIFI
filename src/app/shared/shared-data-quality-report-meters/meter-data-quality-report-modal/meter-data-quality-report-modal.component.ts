import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-meter-data-quality-report-modal',
  standalone: false,
  templateUrl: './meter-data-quality-report-modal.component.html',
  styleUrl: './meter-data-quality-report-modal.component.css'
})
export class MeterDataQualityReportModalComponent {
  @Input({ required: true })
  selectedMeter: IdbUtilityMeter;
  @Input({ required: true })
  meterData: Array<IdbUtilityMeterData>;


  @ViewChild('openModalBtn') openModalBtn: ElementRef;
  @ViewChild('dataQualityModal') dataQualityModal: ElementRef;
  showGraphs: boolean = false;
  activeGraph: string;
  energyOutlierCount: number = 0;
  costOutlierCount: number = 0;
  showAlert: boolean = false;
  expandSection: string = '';
  binSizeEnergy: number = 10;
  binSizeCost: number = 10;


  showModal: boolean = false;

  openModal() {
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }

  constructor(private cd: ChangeDetectorRef) { }


  ngAfterViewInit() {
    // this.dataQualityModal.nativeElement.addEventListener('show.bs.modal', () => {
    //   this.activeGraph = 'statistics';
    // });

    // this.dataQualityModal.nativeElement.addEventListener('shown.bs.modal', () => {
    //   this.showGraphs = true;
    //   if (!this.showAlert) {
    //     this.expandSection = 'statistics';
    //   }
    // });

    // this.dataQualityModal.nativeElement.addEventListener('hidden.bs.modal', () => {
    //   this.showGraphs = false;
    //   this.showAlert = false;
    //   this.activeGraph = '';
    //   this.expandSection = '';
    // });
  }

  onModalClose() {
    this.openModalBtn.nativeElement.focus();
  }

  selectOption(option: string) {
    this.activeGraph = option;
  }

  onOutlierDetection(outlierCount: { energy: number; cost: number }) {
    this.energyOutlierCount = outlierCount.energy;
    this.costOutlierCount = outlierCount.cost;
    if (this.energyOutlierCount > 0 || this.costOutlierCount > 0) {
      this.showAlert = true;
    } else {
      this.showAlert = false;
    }
    this.expandSection = this.showAlert ? '' : 'statistics';
    this.cd.detectChanges();
  }

  onPanelClick(section: string) {
    this.expandSection = this.expandSection === section ? '' : section;
    this.activeGraph = this.expandSection === section ? section : '';
  }
}
