import { Component, inject } from '@angular/core';
import {
  AppearanceService,
  CornerStyle,
  Density,
  Palette
} from '../../appearance/appearance.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

interface PaletteOption {
  readonly id: Palette;
  readonly label: string;
}

interface SegmentOption<T> {
  readonly id: T;
  readonly label: string;
  readonly icon: string;
}

@Component({
  selector: 'app-shell-header',
  templateUrl: './shell-header.component.html',
  styleUrls: ['./shell-header.component.css'],
  standalone: false
})
export class ShellHeaderComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly appearance = inject(AppearanceService);

  readonly paletteOptions: Array<PaletteOption> = [
    { id: 'default', label: 'Default' },
    { id: 'steel', label: 'Steel' },
    { id: 'blueprint', label: 'Blueprint' },
    { id: 'forest', label: 'Forest' }
  ];

  readonly densityOptions: Array<SegmentOption<Density>> = [
    { id: 'comfortable', label: 'Comfort', icon: 'fa-grip' },
    { id: 'compact', label: 'Compact', icon: 'fa-table-cells' }
  ];

  readonly cornerOptions: Array<SegmentOption<CornerStyle>> = [
    { id: 'soft', label: 'Soft', icon: 'fa-square' },
    { id: 'square', label: 'Square', icon: 'fa-vector-square' }
  ];

  isSettingsOpen = false;

  closeSettings(): void {
    this.isSettingsOpen = false;
  }

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
  }
}
