import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hideAccountLinks',
  standalone: false
})
export class HideAccountLinksPipe implements PipeTransform {

  transform(url: string, sidebarOpen: boolean, hoverAccount: boolean): boolean {
    if (sidebarOpen || hoverAccount) {
      return false;
    } else if (!url.includes('account') || url.includes('facility')) {
      return true;
    }
    return false;
  }

}
