import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { P1RouteFacade } from '../../p1-route.facade';

const GETTING_STARTED_DRAWER_DELAY_MS = 2500;

@Component({
  selector: 'app-p1-workspace-shell',
  templateUrl: './workspace-shell.component.html',
  styleUrls: ['./workspace-shell.component.css'],
  standalone: false
})
export class P1WorkspaceShellComponent {
  readonly facade = inject(P1RouteFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap
  });
  private readonly isGettingStartedDrawerDelayComplete = signal(false);
  private readonly isGettingStartedDrawerRequested = computed(() =>
    this.queryParamMap().get('gettingStarted') === 'new-account' && this.facade.state().status === 'ready'
  );

  readonly isGettingStartedDrawerOpen = computed(() =>
    this.isGettingStartedDrawerRequested() && this.isGettingStartedDrawerDelayComplete()
  );

  constructor() {
    effect(onCleanup => {
      if (!this.isGettingStartedDrawerRequested()) {
        this.isGettingStartedDrawerDelayComplete.set(false);
        return;
      }

      this.isGettingStartedDrawerDelayComplete.set(false);
      const timeoutId = setTimeout(() => {
        this.isGettingStartedDrawerDelayComplete.set(true);
      }, GETTING_STARTED_DRAWER_DELAY_MS);

      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  closeGettingStartedDrawer(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { gettingStarted: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  startWithTodos(): void {
    this.facade.openTodoList({
      queryParams: { gettingStarted: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
