import { Component, input } from '@angular/core';
@Component({ selector: 'app-model-equation', standalone: false, templateUrl: './model-equation.component.html',
  styleUrls: ['./model-equation.component.css'] })
export class ModelEquationComponent {
  readonly label = input.required<string>();
  readonly expression = input.required<string>();
}
