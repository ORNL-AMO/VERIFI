import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-facility-data-placeholder',
  templateUrl: './facility-data-placeholder.component.html',
  styleUrls: ['./facility-data-placeholder.component.css'],
  standalone: false
})
export class FacilityDataPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] as string;
}
