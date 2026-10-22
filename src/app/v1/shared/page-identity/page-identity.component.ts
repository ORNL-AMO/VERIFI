import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { IconName } from '@app/v1/shared/icons/icon-registry';

export interface PageBreadcrumb { readonly label: string; readonly route?: readonly string[]; }
@Component({
  selector: 'app-page-identity', standalone: true, imports: [RouterLink, IconComponent],
  templateUrl: './page-identity.component.html', styleUrls: ['./page-identity.component.css']
})
export class PageIdentityComponent {
  readonly breadcrumbs = input.required<readonly PageBreadcrumb[]>();
  readonly title = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly headingId = input.required<string>();
  readonly breadcrumbLabel = input('Data context');
  readonly customTitle = input(false);
}
