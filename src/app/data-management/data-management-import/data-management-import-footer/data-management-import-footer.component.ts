import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DataManagementImportNavigationService, GoToOption, GoToOptionValue } from '../data-management-import-navigation.service';
import { FileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';

@Component({
  selector: 'app-data-management-import-footer',
  standalone: false,

  templateUrl: './data-management-import-footer.component.html',
  styleUrl: './data-management-import-footer.component.css'
})
export class DataManagementImportFooterComponent {
  @Input()
  disableNext: boolean;
  @Input({ required: true })
  fileReference: FileReference;
  @Input({ required: true })
  navOption: GoToOptionValue;
  @Output('emitSubmit')
  emitSubmit: EventEmitter<boolean> = new EventEmitter<boolean>();


  goBackOptions: Array<GoToOption> = [];
  stepNumber: number;
  totalSteps: number;
  progressWidth: number;
  constructor(private dataManagementImportNavigationService: DataManagementImportNavigationService) {
  }

  ngOnInit() {
    this.goBackOptions = this.dataManagementImportNavigationService.getGoBackOptions(this.navOption, this.fileReference);
    let allOptions: Array<GoToOptionValue> = this.dataManagementImportNavigationService.getGoBackOptions('review-and-submit', this.fileReference).map(option => {
      return option.value;
    });
    if (this.navOption != 'review-and-submit') {
      this.stepNumber = allOptions.indexOf(this.navOption);
    } else {
      this.stepNumber = allOptions.length;
    }
    this.totalSteps = allOptions.length;
    this.progressWidth = (this.stepNumber / this.totalSteps) * 100;
  }

  next() {
    this.dataManagementImportNavigationService.next(this.navOption, this.fileReference);
  }

  goBack() {
    this.dataManagementImportNavigationService.back(this.navOption, this.fileReference);
  }

  goToOption(optionValue: GoToOptionValue) {
    this.dataManagementImportNavigationService.goToPage(optionValue, this.fileReference);
  }

  async submitImport() {
    this.emitSubmit.emit(true);
  }
}
