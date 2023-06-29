import { Pipe, PipeTransform } from '@angular/core';
import { ConvertUnitsService } from '../convert-units/convert-units.service';

@Pipe({
  name: 'settingsLabel'
})
export class SettingsLabelPipe implements PipeTransform {

  constructor(private convertUnitsService: ConvertUnitsService) { }

  transform(value: string, per?: string): any {
    if (value && value !== 'F' && value !== 'C' && value !== 'K') {
      let foundUnit = this.convertUnitsService.getUnit(value);
      if (foundUnit) {
        let dispUnit: string = foundUnit.unit.name.display;
        dispUnit = dispUnit.replace('(', '');
        dispUnit = dispUnit.replace(')', '');
        if (per && value != 'kWh') {
          dispUnit = dispUnit + per
        }
        return dispUnit;
      } else {
        return value + ' (unsupported unit)';
      }
    } else if (value && (value === 'F' || value === 'C' || value === 'K')) {
      if (value === 'F') {
        return '&#8457;';
      } else if (value === 'C') {
        return '&#8451;';
      } else if (value === 'K') {
        return '&#8490;';
      }
    } else {
      return '';
    }
  }
}
