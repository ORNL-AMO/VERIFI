import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-account-custom-data-placeholder',
  templateUrl: './account-custom-data-placeholder.component.html',
  styleUrls: ['./account-custom-data-placeholder.component.css'],
  standalone: false
})
export class AccountCustomDataPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] as string;
}
