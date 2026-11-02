import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';

@Component({
  selector: 'app-meter-workspace',
  templateUrl: './meter-workspace.component.html',
  styleUrls: ['./meter-workspace.component.css'],
  standalone: true,
  imports: [RouterOutlet],
  providers: [FacilityMetersWorkspaceService]
})
export class MeterWorkspaceComponent { }
