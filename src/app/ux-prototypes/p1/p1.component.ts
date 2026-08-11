import { Component } from '@angular/core';
import { p1PrototypeData } from './p1.mock-data';
import {
  P1AccountSummary,
  P1ContextMode,
  P1FacilitySummary,
  P1NavItem,
  P1PanelTabId,
  P1SectionId
} from './p1.models';

@Component({
  selector: 'app-p1',
  templateUrl: './p1.component.html',
  styleUrls: ['./p1.component.css'],
  standalone: false
})
export class P1Component {
  readonly data = p1PrototypeData;
  isWorkspaceOpen = false;
  selectedAccountId = this.data.accounts[0].id;
  selectedFacilityId = this.data.facilities[0].id;
  contextMode: P1ContextMode = 'account';
  activeSection: P1SectionId = 'home';
  activePanelTab: P1PanelTabId = 'help';
  activeDetailId = this.getFirstDetailId('account', 'home');
  isRightPanelOpen = true;

  get selectedAccount(): P1AccountSummary {
    return this.data.accounts.find(account => account.id === this.selectedAccountId) || this.data.accounts[0];
  }

  get selectedFacility(): P1FacilitySummary {
    return this.data.facilities.find(facility => facility.id === this.selectedFacilityId) || this.data.facilities[0];
  }

  get accountFacilities(): Array<P1FacilitySummary> {
    return this.data.facilities.filter(facility => facility.accountId === this.selectedAccount.id);
  }

  get activeNavItem(): P1NavItem {
    const groups = this.data.nav[this.contextMode][this.activeSection];
    const allItems = groups.flatMap(group => group.items);
    return allItems.find(item => item.id === this.activeDetailId) || allItems[0];
  }

  openWorkspace(accountId: string = this.selectedAccountId): void {
    this.selectedAccountId = accountId;
    const firstFacility = this.accountFacilities[0] || this.data.facilities[0];
    this.selectedFacilityId = firstFacility.id;
    this.isWorkspaceOpen = true;
    this.setContext('account');
    this.setSection('home');
  }

  showWelcome(): void {
    this.isWorkspaceOpen = false;
  }

  setContext(contextMode: P1ContextMode): void {
    this.contextMode = contextMode;
    this.activeDetailId = this.getFirstDetailId(this.contextMode, this.activeSection);
  }

  setFacility(facilityId: string): void {
    this.selectedFacilityId = facilityId;
    this.setContext('facility');
  }

  setSection(sectionId: P1SectionId): void {
    this.activeSection = sectionId;
    this.activeDetailId = this.getFirstDetailId(this.contextMode, this.activeSection);
  }

  setDetail(detailId: string): void {
    this.activeDetailId = detailId;
  }

  setPanelTab(tabId: P1PanelTabId): void {
    this.activePanelTab = tabId;
    this.isRightPanelOpen = true;
  }

  toggleRightPanel(): void {
    this.isRightPanelOpen = !this.isRightPanelOpen;
  }

  private getFirstDetailId(contextMode: P1ContextMode, sectionId: P1SectionId): string {
    return this.data.nav[contextMode][sectionId][0].items[0].id;
  }
}
