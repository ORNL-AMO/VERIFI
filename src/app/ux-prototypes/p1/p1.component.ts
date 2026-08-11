import { Component } from '@angular/core';
import { p1WorkspaceSummary } from './p1.mock-data';

@Component({
  selector: 'app-p1',
  templateUrl: './p1.component.html',
  styleUrls: ['./p1.component.css'],
  standalone: false
})
export class P1Component {
  readonly workspace = p1WorkspaceSummary;
}
