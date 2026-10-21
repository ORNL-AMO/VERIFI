import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AccountAnalysisDashboardCard } from '../account-analysis.models';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { buildAccountAnalysisComparisonView } from './account-analysis-comparison.view';

@Component({
  selector: 'app-account-analysis-comparison',
  standalone: true,
  imports: [MeterResultsChartComponent, AnalysisResultNumberPipe],
  templateUrl: './account-analysis-comparison.component.html',
  styleUrls: ['./account-analysis-comparison.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountAnalysisComparisonComponent {
  readonly cards = input.required<readonly AccountAnalysisDashboardCard[]>();
  readonly fiscalYear = input<string | undefined>(undefined);
  readonly showCategory = input(true);
  readonly comparison = computed(() => {
    const cards = this.cards();
    if (cards.length !== 2) return undefined;
    const view = buildAccountAnalysisComparisonView(cards[0], cards[1], this.fiscalYear());
    return { ...view, fields: this.showCategory() ? view.fields : view.fields.filter(field => field.id !== 'category') };
  });
}
