import { Component, EventEmitter, Input, Output } from '@angular/core';
import { P1AccountSummary, P1ContextMode, P1FacilitySummary } from '../../p1.models';

@Component({
  selector: 'app-p1-header-banner',
  templateUrl: './header-banner.component.html',
  styleUrls: ['./header-banner.component.css'],
  standalone: false
})
export class P1HeaderBannerComponent {
  @Input() account: P1AccountSummary;
  @Input() accounts: Array<P1AccountSummary> = [];
  @Input() facility: P1FacilitySummary;
  @Input() facilities: Array<P1FacilitySummary> = [];
  @Input() contextMode: P1ContextMode = 'account';
  @Input() isWorkspaceOpen = false;
  @Input() darkMode = false;
  @Input() isRightPanelOpen = true;

  @Output() welcomeRequested = new EventEmitter<void>();
  @Output() workspaceRequested = new EventEmitter<void>();
  @Output() contextChange = new EventEmitter<P1ContextMode>();
  @Output() facilityChange = new EventEmitter<string>();
  @Output() accountChange = new EventEmitter<string>();
  @Output() darkModeChange = new EventEmitter<boolean>();
  @Output() rightPanelToggle = new EventEmitter<void>();

  accountMenuOpen = false;
  facilityMenuOpen = false;
  appMenuOpen = false;

  get hasBackdrop(): boolean {
    return this.accountMenuOpen || this.facilityMenuOpen || this.appMenuOpen;
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen = !this.accountMenuOpen;
    this.facilityMenuOpen = false;
    this.appMenuOpen = false;
  }

  toggleFacilityMenu(): void {
    this.facilityMenuOpen = !this.facilityMenuOpen;
    this.accountMenuOpen = false;
    this.appMenuOpen = false;
  }

  toggleAppMenu(): void {
    this.appMenuOpen = !this.appMenuOpen;
    this.accountMenuOpen = false;
    this.facilityMenuOpen = false;
  }

  closeAll(): void {
    this.accountMenuOpen = false;
    this.facilityMenuOpen = false;
    this.appMenuOpen = false;
  }

  selectAccount(id: string): void {
    this.accountChange.emit(id);
    this.closeAll();
  }

  selectFacility(id: string): void {
    this.facilityChange.emit(id);
    this.closeAll();
  }

  switchToAccountContext(): void {
    this.contextChange.emit('account');
    this.closeAll();
  }

  switchToSingleFacility(): void {
    this.facilityChange.emit(this.facilities[0].id);
    this.closeAll();
  }
}
