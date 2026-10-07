import { Component, inject } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchNavigationService } from '../navigation/facility-analysis-workbench-navigation.service';

@Component({
  selector: 'app-facility-analysis-workbench-footer',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './facility-analysis-workbench-footer.component.html',
  styleUrls: ['./facility-analysis-workbench-footer.component.css']
})
export class FacilityAnalysisWorkbenchFooterComponent {
  readonly workflow = inject(FacilityAnalysisWorkbenchNavigationService);
}
