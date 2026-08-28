import { Component, HostListener, inject } from '@angular/core';
import {
  AppearanceService,
  BackgroundPattern,
  CornerStyle,
  Palette
} from '../../appearance/appearance.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

interface PaletteOption {
  readonly id: Palette;
  readonly label: string;
  readonly swatchClass: string;
}

interface SegmentOption<T> {
  readonly id: T;
  readonly label: string;
  readonly icon: string;
}

interface PatternOption {
  readonly id: BackgroundPattern;
  readonly label: string;
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
    { id: 'default', label: 'Default', swatchClass: 'v1-settings__swatch--default' },
    { id: 'steel', label: 'Steel', swatchClass: 'v1-settings__swatch--steel' },
    { id: 'blueprint', label: 'Blueprint', swatchClass: 'v1-settings__swatch--blueprint' },
    { id: 'neon', label: 'Neon', swatchClass: 'v1-settings__swatch--neon' },
    { id: 'aurora', label: 'Aurora', swatchClass: 'v1-settings__swatch--aurora' },
    { id: 'forest', label: 'Forest', swatchClass: 'v1-settings__swatch--forest' }
  ];

  readonly cornerOptions: Array<SegmentOption<CornerStyle>> = [
    { id: 'soft', label: 'Soft', icon: 'fa-square' },
    { id: 'square', label: 'Square', icon: 'fa-vector-square' }
  ];

  readonly patternOptions: Array<PatternOption> = [
    { id: 'blueprint-grid', label: 'Blueprint grid' },
    { id: 'steel-hatch', label: 'Machined hatch' },
    { id: 'neon-grid', label: 'Neon grid' },
    { id: 'aurora-flow', label: 'Aurora flow' },
    { id: 'topographic-contours', label: 'Topographic contours' }
  ];

  isSettingsOpen = false;
  accountMenuOpen = false;

  get hasBackdrop(): boolean {
    return this.isSettingsOpen || this.accountMenuOpen;
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeAll();
  }

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    if (this.isSettingsOpen) {
      this.accountMenuOpen = false;
    }
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen = !this.accountMenuOpen;
    if (this.accountMenuOpen) {
      this.isSettingsOpen = false;
    }
  }

  selectAccount(accountGuid: string): void {
    this.closeAll();
    void this.navigation.openWorkspace(accountGuid);
  }

  closeAll(): void {
    this.isSettingsOpen = false;
    this.accountMenuOpen = false;
  }
}
