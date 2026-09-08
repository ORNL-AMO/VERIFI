import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FacilityMetersWorkspaceService } from './facility-meters-workspace.service';

@Component({
  selector: 'app-facility-meters',
  templateUrl: './facility-meters.component.html',
  styleUrls: ['./facility-meters.component.css'],
  standalone: true,
  imports: [RouterOutlet],
  providers: [FacilityMetersWorkspaceService]
})
export class FacilityMetersComponent { }
