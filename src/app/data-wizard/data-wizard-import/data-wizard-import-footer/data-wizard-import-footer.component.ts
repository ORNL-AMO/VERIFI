import { Component, Input } from '@angular/core';
import { DataWizardImportNavigationService, GoToOption, GoToOptionValue } from '../data-wizard-import-navigation.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-data-wizard-import-footer',
  standalone: false,

  templateUrl: './data-wizard-import-footer.component.html',
  styleUrl: './data-wizard-import-footer.component.css'
})
export class DataWizardImportFooterComponent {
  @Input()
  disableNext: boolean;
  @Input({ required: true })
  fileReference: FileReference;
  @Input({ required: true })
  navOption: GoToOptionValue;


  goBackOptions: Array<GoToOption> = [];
  stepNumber: number;
  totalSteps: number;
  progressWidth: number;
  constructor(private dataWizardImportNavigationService: DataWizardImportNavigationService,
    private uploadDataService: UploadDataService
  ) {
  }

  ngOnInit() {
    this.goBackOptions = this.dataWizardImportNavigationService.getGoBackOptions(this.navOption, this.fileReference);
    let allOptions: Array<GoToOptionValue> = this.dataWizardImportNavigationService.getGoBackOptions('review-and-submit', this.fileReference).map(option => {
      return option.value;
    });
    if(this.navOption != 'review-and-submit'){
      this.stepNumber = allOptions.indexOf(this.navOption);
    }else{
      this.stepNumber = allOptions.length;
    }
    this.totalSteps = allOptions.length;
    this.progressWidth = (this.stepNumber / this.totalSteps) * 100;
  }

  next() {
    this.dataWizardImportNavigationService.next(this.navOption, this.fileReference);
  }

  goBack() {
    this.dataWizardImportNavigationService.back(this.navOption, this.fileReference);
  }

  goToOption(optionValue: GoToOptionValue) {
    this.dataWizardImportNavigationService.goToPage(optionValue, this.fileReference);
  }

  async submitImport() {
    this.fileReference = await this.uploadDataService.submit(this.fileReference);
  }
}
