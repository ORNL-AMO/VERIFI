import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HomeContext } from './home-context.service';
import type { HomeDisplayDefaults } from '@domain/home/home-dashboard';
import type { HomeDisplayDraft } from './display-controls/display-controls.component';

/** Account-session browsing never writes owner, dashboard or visualization records. */
@Injectable({ providedIn: 'root' })
export class HomeBrowseSession {
  private readonly home = inject(HomeContext);
  private readonly sessions = signal<ReadonlyMap<string, { draft: HomeDisplayDraft; effective: HomeDisplayDefaults }>>(new Map());
  readonly key = computed(() => JSON.stringify([this.home.workspace.sessionRevision(), this.home.workspace.account()?.guid, this.home.owner(), this.home.selectedGuid()]));
  readonly current = computed(() => this.sessions().get(this.key()));
  readonly effective = computed(() => this.current()?.effective ?? this.home.definition()?.defaults ?? {});
  constructor() {
    let account = this.home.workspace.account()?.guid, session = this.home.workspace.sessionRevision();
    effect(() => { const next = this.home.workspace.account()?.guid;
      const revision = this.home.workspace.sessionRevision();
      if (account !== next || session !== revision) { account = next; session = revision; this.sessions.set(new Map()); }
    });
  }
  update(draft: HomeDisplayDraft): void {
    const effective = draft.valid ? draft.value : this.effective();
    this.sessions.update(sessions => new Map(sessions).set(this.key(), { draft, effective }));
  }
  reset(): void { this.sessions.update(sessions => { const next = new Map(sessions); next.delete(this.key()); return next; }); }
}
