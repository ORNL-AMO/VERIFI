import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-energy-uses-placeholder',
  templateUrl: './energy-uses-placeholder.component.html',
  styleUrls: ['./energy-uses-placeholder.component.css'],
  standalone: false
})
export class EnergyUsesPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] as string;
}
