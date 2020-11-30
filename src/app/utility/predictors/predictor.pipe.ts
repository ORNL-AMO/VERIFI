import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filter'
})
export class PredictorPipe implements PipeTransform {
    transform(items: Array<any>, name: string): Array<any> {
        return items.filter(item => item.name === name);
    }
}