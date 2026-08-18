import { Component, inject } from '@angular/core';
import { P1RouteFacade } from './p1-route.facade';

@Component({
  selector: 'app-p1',
  templateUrl: './p1.component.html',
  styleUrls: ['./p1.component.css'],
  standalone: false
})
export class P1Component {
  readonly facade = inject(P1RouteFacade);
}
