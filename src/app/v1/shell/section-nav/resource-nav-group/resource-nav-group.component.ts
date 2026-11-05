import { Component, computed, effect, inject, input } from '@angular/core';
import type { ResourceNavGroup } from '../models';
import { SectionNavDisclosureService } from '../section-nav-disclosure.service';

@Component({
  selector: 'app-resource-nav-group',
  templateUrl: './resource-nav-group.component.html',
  styleUrls: ['./resource-nav-group.component.css'],
  standalone: false
})
export class ResourceNavGroupComponent {
  readonly group = input.required<ResourceNavGroup>();
  private readonly disclosure = inject(SectionNavDisclosureService);
  readonly canToggle = computed(() => this.group().routeActive && this.group().children.length > 0);
  readonly open = computed(() => this.canToggle() && this.disclosure.isOpen(this.group().id, this.group().facilityGuid));
  readonly toggleLabel = computed(() => `${this.open() ? 'Hide' : 'Show'} ${this.group().childrenLabel.toLowerCase()}`);

  readonly entries = computed(() => this.group().children.map(child => ({ ...child,
    open: !!child.disclosureKey && this.disclosure.isNestedOpen(child.disclosureKey) })));
  constructor() {
    effect(() => {
      if (this.group().id !== 'energy-uses') return;
      const active = this.group().children.find(child => child.activeChildGuid);
      this.disclosure.revealActive(active?.disclosureKey, active?.activeChildGuid, this.group().facilityGuid);
    });
  }
  toggleNested(key: string): void { this.disclosure.toggleNested(key); }
  toggle(): void {
    if (!this.canToggle()) return;
    this.disclosure.toggle(this.group().id, this.group().facilityGuid);
  }
}
