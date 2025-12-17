import { Component } from '@angular/core';
import { docLinks } from '../docs-links';

@Component({
  selector: 'app-documentation-home',
  standalone: false,
  templateUrl: './documentation-home.component.html',
  styleUrl: './documentation-home.component.css'
})
export class DocumentationHomeComponent {

  docs = docLinks;
}
