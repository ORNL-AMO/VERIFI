import { Component, computed, input } from '@angular/core';
import { FacilityGroupContributionsView } from './group-contributions.view';

/** Presentation only; each workspace owns result demand, reporting years and document framing. */
@Component({ selector: 'app-group-contributions', standalone: false,
  templateUrl: './group-contributions.component.html', styleUrls: ['./group-contributions.component.css'] })
export class GroupContributionsComponent {
  readonly view = input.required<FacilityGroupContributionsView>();
  readonly unit = input<string>();
  readonly showTable = input(true);
  readonly showChart = input(true);
  readonly embedded = input(false);
  readonly showChartActions = input(true);
  readonly deferUntilVisible = input(false);
  readonly hasContributionData = computed(() => this.view().groups.length > 0 && this.view().years.length > 0);
  readonly heatmapView = computed(() => ({
    labels: this.view().groups.map(group => group.groupName),
    years: this.view().years.map(year => ({ year: year.year, totalContributionPercent: year.totalContributionPercent,
      contributions: year.groups.map(group => group.contributionPercent) }))
  }));
}
