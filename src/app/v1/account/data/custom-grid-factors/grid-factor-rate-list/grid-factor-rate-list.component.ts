import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray } from '@angular/forms';

@Component({
  selector: 'app-grid-factor-rate-list',
  templateUrl: './grid-factor-rate-list.component.html',
  styleUrls: ['./grid-factor-rate-list.component.css'],
  standalone: false
})
export class GridFactorRateListComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) rates!: FormArray;
  @Input({ required: true }) years: readonly number[] = [];
  @Input() directRate = false;
  @Input() saving = false;
  @Output() addRate = new EventEmitter<void>();
  @Output() removeRate = new EventEmitter<number>();
  @Output() recalculate = new EventEmitter<number>();
}
