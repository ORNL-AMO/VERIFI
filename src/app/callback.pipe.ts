import { PipeTransform, Pipe } from '@angular/core';

@Pipe({
    name: 'callback',
    pure: false
})
export class CallbackPipe implements PipeTransform {
    transform(items: Array<any>, id: number): Array<any> {
        return items.filter(item => item.id === id);
    }
}