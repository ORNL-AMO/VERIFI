import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ImportStepDefinition } from '../import-workflow.config';

@Component({
  selector: 'app-import-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-stepper.component.html',
  styleUrls: ['./import-stepper.component.css']
})
export class ImportStepperComponent {
  readonly steps = input.required<ImportStepDefinition[]>();
  readonly currentStep = input.required<string>();
  readonly completedSteps = input.required<string[]>();
  readonly stepSelected = output<string>();

  isCompleted(step: ImportStepDefinition): boolean {
    return this.completedSteps().includes(step.id);
  }

  canOpen(step: ImportStepDefinition): boolean {
    return step.id === this.currentStep() || this.isCompleted(step);
  }
}
