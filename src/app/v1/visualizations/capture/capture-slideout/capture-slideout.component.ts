import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { VisualizationCaptureSession } from '../visualization-capture-session';

@Component({
  selector: 'app-visualization-capture-slideout', standalone: false,
  templateUrl: './capture-slideout.component.html', styleUrls: ['./capture-slideout.component.css']
})
export class CaptureSlideoutComponent implements OnChanges {
  @Input({ required: true }) definition!: VisualizationDefinition;
  @Input({ required: true }) session!: VisualizationCaptureSession;
  @Input() error = '';
  @Output() saveRequested = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] });
  readonly form = new FormGroup({ name: this.name });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['definition']) this.name.reset(this.definition.name, { emitEvent: false });
  }

  save(): void {
    if (this.session.saving()) return;
    this.name.markAsTouched();
    if (this.name.valid) this.saveRequested.emit(this.name.value.trim());
  }
}
