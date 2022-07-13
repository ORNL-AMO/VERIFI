import { Pipe, PipeTransform } from '@angular/core';
import { ScopeOption, ScopeOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';

@Pipe({
  name: 'scopeLabel'
})
export class ScopeLabelPipe implements PipeTransform {

  transform(value: number): string {
    let scope: ScopeOption = ScopeOptions.find(option => { return option.value == value });
    if (scope) {
      return scope.optionLabel;
    } else {
      return '';
    }
  }

}
