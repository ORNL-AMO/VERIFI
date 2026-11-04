import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Component, HostListener, ViewChild, computed, inject } from '@angular/core';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import {
  AppearanceService,
  BackgroundPattern,
  CornerStyle,
  Palette
} from '@app/v1/appearance/appearance.service';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

import { FacilityPickerComponent } from './facility-picker/facility-picker.component';

interface PaletteOption {
  readonly id: Palette;
  readonly label: string;
  readonly swatchClass: string;
}

interface SegmentOption<T> {
  readonly id: T;
  readonly label: string;
  readonly icon: IconName;
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
  private readonly workspace = inject(AccountWorkspaceStore);
  readonly facilityOrder = computed(() => this.workspace.account()?.portfolioFacilityOrder);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly narrowSupportPanel = toSignal(
    this.breakpoints.observe('(max-width: 1160px)').pipe(map(state => state.matches)),
    { initialValue: this.breakpoints.isMatched('(max-width: 1160px)') }
  );
  readonly supportPanelVisible = computed(() => this.navigation.isSupportPanelOpen()
    && (!this.narrowSupportPanel() || this.navigation.supportPanelRequested()));
  readonly appearance = inject(AppearanceService);
  readonly backups = inject(ManualBackupDownloadService);
  readonly backupDescription = computed(() =>
    `${this.navigation.account()?.name ?? 'Account'}. Download a JSON backup of this entire account. ${this.backups.reminder().detail}`
  );
  backupTooltipOpen = false;

  downloadAccountBackup(): void {
    const account = this.navigation.account();
    if (account) void this.backups.download({ scope: 'account', accountGuid: account.guid, format: 'json' });
  }

  readonly paletteOptions: Array<PaletteOption> = [
    { id: 'default', label: 'Default', swatchClass: 'v1-settings__swatch--default' },
    { id: 'steel', label: 'Steel', swatchClass: 'v1-settings__swatch--steel' },
    { id: 'blueprint', label: 'Blueprint', swatchClass: 'v1-settings__swatch--blueprint' },
    { id: 'neon', label: 'Neon', swatchClass: 'v1-settings__swatch--neon' },
    { id: 'aurora', label: 'Aurora', swatchClass: 'v1-settings__swatch--aurora' },
    { id: 'forest', label: 'Forest', swatchClass: 'v1-settings__swatch--forest' }
  ];

  readonly cornerOptions: Array<SegmentOption<CornerStyle>> = [
    { id: 'soft', label: 'Soft', icon: 'square' },
    { id: 'square', label: 'Square', icon: 'vectorSquare' }
  ];

  readonly patternOptions: Array<PatternOption> = [
    { id: 'skyline-rocket', label: 'Skyline rocket' },
    { id: 'skyline-rocket-night', label: 'Night skyline rocket' },
    { id: 'skyline-green', label: 'Green skyline' },
    { id: 'skyline-neon', label: 'Neon skyline' },
    { id: 'skyline-aurora', label: 'Aurora skyline' },
    { id: 'skyline-blueprint', label: 'Blueprint skyline' },
    { id: 'skyline-steel', label: 'Steel skyline' },
    { id: 'blueprint-grid', label: 'Blueprint grid' },
    { id: 'steel-hatch', label: 'Machined hatch' },
    { id: 'neon-grid', label: 'Neon grid' },
    { id: 'aurora-flow', label: 'Aurora flow' },
    { id: 'topographic-contours', label: 'Topographic contours' }
  ];

  isSettingsOpen = false;
  @ViewChild('facilityPicker') private facilityPicker?: FacilityPickerComponent;

  get hasBackdrop(): boolean {
    return this.isSettingsOpen;
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closeAll();
    this.facilityPicker?.close();
  }

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    if (this.isSettingsOpen) this.facilityPicker?.close();
  }

  setBackgroundPattern(value: string): void {
    if (this.patternOptions.some(option => option.id === value)) {
      this.appearance.setBackgroundPattern(value as BackgroundPattern);
    }
  }

  closeAll(): void {
    this.backupTooltipOpen = false;
    this.isSettingsOpen = false;
  }
}
