import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css']
})
export class PaginationComponent {
  readonly collectionSize = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly page = input.required<number>();
  readonly disabled = input(false);
  readonly ariaLabel = input('Table pages');
  readonly pageChange = output<number>();

  readonly pageCount = computed(() => {
    const total = Number.isFinite(this.collectionSize()) ? Math.max(0, Math.floor(this.collectionSize())) : 0;
    const size = Number.isFinite(this.pageSize()) ? Math.max(1, Math.floor(this.pageSize())) : 1;
    return Math.max(1, Math.ceil(total / size));
  });
  readonly currentPage = computed(() => Math.min(this.pageCount(), Math.max(1,
    Number.isFinite(this.page()) ? Math.floor(this.page()) : 1)));
  readonly pages = computed(() => {
    const first = Math.floor((this.currentPage() - 1) / 5) * 5 + 1;
    return Array.from({ length: Math.min(5, this.pageCount() - first + 1) }, (_, index) => first + index);
  });
  readonly previousDisabled = computed(() => this.disabled() || this.currentPage() === 1);
  readonly nextDisabled = computed(() => this.disabled() || this.currentPage() === this.pageCount());

  selectPage(page: number): void {
    if (!this.disabled() && Number.isInteger(page) && page >= 1 && page <= this.pageCount() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
