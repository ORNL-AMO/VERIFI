import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportStepDefinition } from '../import-workflow.config';

@Component({
  selector: 'app-import-stepper',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './import-stepper.component.html',
  styleUrls: ['./import-stepper.component.css']
})
export class ImportStepperComponent {
  readonly accountGuid = input.required<string>();
  readonly fileId = input.required<string>();
  readonly fileName = input.required<string>();
  readonly steps = input.required<ReadonlyArray<ImportStepDefinition>>();
  readonly currentStep = input.required<string>();
  readonly completedSteps = input.required<ReadonlyArray<string>>();
  readonly activeFile = input(false);
  readonly disabled = input(false);

  isCompleted(step: ImportStepDefinition): boolean {
    return this.completedSteps().includes(step.id);
  }

  canOpen(step: ImportStepDefinition): boolean {
    return !this.disabled() && (step.id === this.currentStep() || this.isCompleted(step));
  }
}
