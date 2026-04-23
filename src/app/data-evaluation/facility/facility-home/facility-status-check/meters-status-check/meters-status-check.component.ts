import { Component, Input } from '@angular/core';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';

@Component({
    selector: 'app-meters-status-check',
    standalone: false,
    templateUrl: './meters-status-check.component.html',
    styleUrl: './meters-status-check.component.css'
})
export class MetersStatusCheckComponent {
    @Input({ required: true }) metersStatusChecks: Array<MeterStatusCheck>;
    @Input({ required: true }) metersStatus: 'good' | 'warning' | 'error';
}
