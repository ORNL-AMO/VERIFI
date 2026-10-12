import { Component, inject } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountAnalysisWorkbenchNavigationService } from '../navigation/account-analysis-workbench-navigation.service';

@Component({
  selector: 'app-account-analysis-workbench-footer',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './account-analysis-workbench-footer.component.html',
  styleUrls: ['./account-analysis-workbench-footer.component.css']
})
export class AccountAnalysisWorkbenchFooterComponent {
  readonly workflow = inject(AccountAnalysisWorkbenchNavigationService);
}
