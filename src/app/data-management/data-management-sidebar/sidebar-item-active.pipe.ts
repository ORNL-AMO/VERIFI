import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sidebarItemActive',
  standalone: false
})
export class SidebarItemActivePipe implements PipeTransform {

  transform(url: string, context: SidebarItemContext, contextGuid?: string): boolean {
    if (context === 'facilities-folder') {
      return url.includes('facilities');
    } else if (context === 'facility') {
      return url.includes('facilities') && url.includes(contextGuid);
    } else if (context === 'meters-folder') {
      return (url.includes('meters') || url.includes('meter-grouping')) && url.includes(contextGuid);
    } else if (context === 'meter') {
      return url.includes('meters') && url.includes(contextGuid);
    } else if (context === 'predictors-folder') {
      return url.includes('predictors') && url.includes(contextGuid);
    } else if (context === 'predictor') {
      return url.includes('predictors') && url.includes(contextGuid);
    }
    return null;
  }

}

type SidebarItemContext = 'facilities-folder' | 'facility' | 'meters-folder' | 'meter' | 'predictors-folder' | 'predictor';