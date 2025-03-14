import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DataWizardService } from '../data-wizard.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Injectable({
  providedIn: 'root'
})
export class DataWizardImportNavigationService {

  constructor(private router: Router, private accountDbService: AccountdbService
  ) { }


  next(currentNavOption: GoToOptionValue, fileReference: FileReference) {
    if (currentNavOption == 'select-worksheet') {
      this.goToPage('identify-columns', fileReference);
    } else if (currentNavOption == 'identify-columns') {
      this.goToPage('map-meters-to-facilities', fileReference)
    } else if (currentNavOption == 'map-meters-to-facilities') {
      this.goToPage('confirm-meters', fileReference)
    } else if (currentNavOption == 'confirm-meters') {
      this.goToPage('meter-readings', fileReference)
    }
  }

  back(currentNavOption: GoToOptionValue, fileReference: FileReference) {
    if (currentNavOption == 'select-worksheet') {
      this.goToPage('upload-files', fileReference);
    } else if (currentNavOption == 'identify-columns') {
      this.goToPage('select-worksheet', fileReference)
    } else if (currentNavOption == 'map-meters-to-facilities') {
      this.goToPage('identify-columns', fileReference)
    } else if (currentNavOption == 'confirm-meters' && !fileReference.isTemplate) {
      this.goToPage('map-meters-to-facilities', fileReference)
    }

  }

  goToPage(goToOption: GoToOptionValue, fileReference: FileReference) {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (goToOption == 'upload-files') {
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/upload-files');
    } else if (fileReference.isTemplate) {
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-template-file/' + fileReference.id + '/' + goToOption);
    } else if (!fileReference.isTemplate) {
      this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data/process-general-file/' + fileReference.id + '/' + goToOption);
    }
  }

  getGoBackOptions(currentNavOption: GoToOptionValue, fileReference: FileReference): Array<GoToOption> {
    let optionValues: Array<GoToOptionValue> = [];
    if (currentNavOption == 'identify-columns') {
      optionValues = ['facilities'];
    } else if (currentNavOption == 'map-meters-to-facilities') {
      optionValues = ['select-worksheet', 'facilities'];
    } else if (currentNavOption == 'confirm-meters' && !fileReference.isTemplate) {
      optionValues = ['select-worksheet', 'facilities', 'map-meters-to-facilities'];

    }
    return optionValues.map(opVal => {
      return this.getGoToOption(opVal)
    });
  }

  getGoToOption(optionValue: GoToOptionValue): GoToOption {
    return {
      value: optionValue,
      label: GoToOptionLabels[optionValue]
    }
  }
}

export type GoToOption = {
  value: GoToOptionValue,
  label: string
}

export type GoToOptionValue = 'upload-files' |
  'facilities' |
  'confirm-meters' |
  'select-worksheet' |
  'identify-columns' |
  'map-meters-to-facilities' |
  'meter-readings';

export const GoToOptionLabels = {
  'upload-files': 'Upload Files',
  'facilities': 'Facilities',
  'confirm-meters': 'Confirm Meters',
  'select-worksheet': 'Select Worksheet',
  'identify-columns': 'Identify Columns',
  'meter-readings': 'Meter Readings',
  'map-meters-to-facilities': 'Map Meters to Facilities'
}