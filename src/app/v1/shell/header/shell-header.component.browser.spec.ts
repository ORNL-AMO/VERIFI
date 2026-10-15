import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NgModule, signal } from '@angular/core';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { ShellHeaderComponent } from './shell-header.component';

@NgModule({ imports: [CommonModule, IconComponent], declarations: [ShellHeaderComponent] })
class HeaderTooltipTestModule { }

describe('backup tooltip contrast', () => {
  it.each(['default', 'steel', 'blueprint', 'neon', 'aurora', 'forest'])('is readable in %s light/dark and high-contrast modes', palette => {
    TestBed.configureTestingModule({
      imports: [HeaderTooltipTestModule],
      providers: [
        { provide: AppearanceService, useValue: {} },
        { provide: WorkspaceNavigationService, useValue: {
          isWorkspaceRoute: () => true, account: () => ({ guid: 'account-a', name: 'Account A' }),
          accountOptions: () => [], isSupportPanelOpen: () => false
        } },
        { provide: ManualBackupDownloadService, useValue: {
          available: signal(true), preparing: signal(false),
          reminder: signal({ tone: 'recommended', label: 'No backup recorded', detail: 'Backup recommended.' })
        } }
      ]
    });
    const fixture = TestBed.createComponent(ShellHeaderComponent);
    fixture.componentInstance.backupTooltipOpen = true;
    fixture.detectChanges();
    for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
      fixture.nativeElement.className = `v1-root v1-palette-${palette} ${mode}`;
      const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;
      const style = getComputedStyle(tooltip);
      expect(tooltip.hidden).toBe(false);
      const text = luminance(style.color);
      const background = luminance(style.backgroundColor);
      expect((Math.max(text, background) + .05) / (Math.min(text, background) + .05)).toBeGreaterThanOrEqual(4.5);
    }
    fixture.destroy();
  });
});

function luminance(color: string): number {
  const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}
