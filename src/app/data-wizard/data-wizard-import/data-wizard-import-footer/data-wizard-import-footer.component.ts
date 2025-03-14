import { Component, Input } from '@angular/core';
import { DataWizardImportNavigationService, GoToOption, GoToOptionValue } from '../data-wizard-import-navigation.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';

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

  constructor(private dataWizardImportNavigationService: DataWizardImportNavigationService) {

  }

  ngOnInit() {
    this.goBackOptions = this.dataWizardImportNavigationService.getGoBackOptions(this.navOption, this.fileReference);
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
}
