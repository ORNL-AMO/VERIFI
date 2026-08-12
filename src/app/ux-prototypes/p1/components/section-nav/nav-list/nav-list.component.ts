import { Component, Input, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params } from '@angular/router';
import { P1NavActiveQueryValue, P1NavGroup, P1NavItem, P1NavQueryValue } from '../../../p1.models';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-nav-list',
  templateUrl: './nav-list.component.html',
  styleUrls: ['./nav-list.component.css'],
  standalone: false
})
export class P1NavListComponent {
  @Input({ required: true }) groups: Array<P1NavGroup> = [];

  readonly facade = inject(P1RouteFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap);
  private readonly collapsedChildIds = new Set<string>();
  private readonly expandedChildIds = new Set<string>();

  hoveredChildId: string | undefined;

  navLink(itemOrDetailId: P1NavItem | string): Array<string> {
    const detailId = typeof itemOrDetailId === 'string' ? itemOrDetailId : (itemOrDetailId.routeId || itemOrDetailId.id);
    const section = this.facade.activeSection();
    const panelTab = this.facade.activePanelTab();
    if (this.facade.contextMode() === 'facility') {
      const facilityId = this.facade.selectedFacility()?.id;
      return facilityId
        ? ['/p1', 'workspace', 'facility', facilityId, section, detailId, panelTab]
        : ['/p1', 'workspace', 'account', section, detailId, panelTab];
    }
    return ['/p1', 'workspace', 'account', section, detailId, panelTab];
  }

  queryParams(item: P1NavItem): Params | null {
    return item.queryParams || null;
  }

  isActive(item: P1NavItem): boolean {
    return this.isRouteActive(item) && this.matchesActiveQueryParams(item);
  }

  hasChildren(item: P1NavItem): boolean {
    return (item.children?.length ?? 0) > 0;
  }

  isChildActive(item: P1NavItem): boolean {
    if (!this.isRouteActive(item)) {
      return false;
    }
    return this.matchesActiveQueryParams(item);
  }

  isChildrenOpen(item: P1NavItem): boolean {
    if (!this.hasChildren(item)) {
      return false;
    }
    if (this.hoveredChildId === item.id || this.expandedChildIds.has(item.id)) {
      return true;
    }
    return this.isActive(item) && !this.collapsedChildIds.has(item.id);
  }

  toggleChildren(item: P1NavItem): void {
    if (!this.hasChildren(item)) {
      return;
    }
    this.hoveredChildId = undefined;
    if (this.isActive(item)) {
      if (this.collapsedChildIds.has(item.id)) {
        this.collapsedChildIds.delete(item.id);
      } else {
        this.collapsedChildIds.add(item.id);
      }
      return;
    }
    if (this.expandedChildIds.has(item.id)) {
      this.expandedChildIds.delete(item.id);
    } else {
      this.expandedChildIds.add(item.id);
    }
  }

  setChildrenHover(item: P1NavItem, isHovered: boolean): void {
    if (!this.hasChildren(item)) {
      return;
    }
    this.hoveredChildId = isHovered ? item.id : undefined;
  }

  private isRouteActive(item: P1NavItem): boolean {
    return this.facade.activeDetailId() === (item.routeId || item.id);
  }

  private matchesActiveQueryParams(item: P1NavItem): boolean {
    const queryParams = item.activeQueryParams || item.queryParams;
    if (!queryParams) {
      return true;
    }
    const queryMap = this.queryParamMap();
    return Object.entries(queryParams).every(([key, expected]) =>
      this.matchesQueryParam(queryMap?.get(key), expected)
    );
  }

  private matchesQueryParam(actual: string | null | undefined, expected: P1NavActiveQueryValue): boolean {
    const values = Array.isArray(expected) ? expected : [expected];
    return values.some(value => this.matchesQueryValue(actual, value));
  }

  private matchesQueryValue(actual: string | null | undefined, expected: P1NavQueryValue): boolean {
    if (expected === undefined) {
      return actual === null || actual === undefined;
    }
    return actual === expected;
  }
}
