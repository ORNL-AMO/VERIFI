import { Pipe, PipeTransform } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AllSources } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'formUtilityTypesIncluded',
  standalone: false,
  pure: false
})
export class FormUtilityTypesIncludedPipe implements PipeTransform {

  transform(form: FormGroup): Array<string> {
    let sources: Array<string> = AllSources.map(source => { return source.replace(/\s+/g, '_'); });
    let includedSources: Array<string> = [];
    for (let source of sources) {
      if (form.contains('utilityData_' + source)) {
        includedSources.push(source);
      }
    }
    return includedSources;
  }

}
