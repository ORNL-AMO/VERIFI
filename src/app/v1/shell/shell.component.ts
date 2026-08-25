import { Component, ViewEncapsulation, inject } from '@angular/core';
import { AppearanceService } from '../appearance/appearance.service';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ShellComponent {
  readonly appearance = inject(AppearanceService);
}
