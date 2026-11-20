import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { homeOwnerKey, HomeDashboardReference, HomeOwner, presentedHomeOwner } from '@domain/home/home-dashboard';
import { homeViewKey } from '@domain/home/home-views';
import { homeOwnerRoute, parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { HomeViewResolver } from './home-view-resolver.service';

interface HomeReturnToken { readonly accountGuid: string; readonly owner: HomeOwner; readonly reference: HomeDashboardReference; readonly widgetId: string; readonly chartGuid: string; readonly scroll: number; }
/** Session-only typed destinations; no caller-provided URLs or cross-account restoration. */
@Injectable({ providedIn: 'root' })
export class HomeReturnService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly resolver = inject(HomeViewResolver);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private token?: HomeReturnToken & { session: number };
  readonly focus = signal<{ ownerKey: string; reference?: HomeDashboardReference; widgetId?: string; scroll: number } | undefined>(undefined);
  constructor() {
    let account = this.workspace.account()?.guid, session = this.workspace.sessionRevision();
    effect(() => { const next = this.workspace.account()?.guid; const revision = this.workspace.sessionRevision(); if (account !== next || session !== revision) { account = next; session = revision; this.token = undefined; this.focus.set(undefined); } });
  }
  remember(token: Omit<HomeReturnToken, 'scroll'>): void {
    this.token = { ...structuredClone(token), session: this.workspace.sessionRevision(), scroll: this.scrollContainer()?.scrollTop ?? 0 };
  }
  private scrollContainer(): Element | null { return this.document.querySelector('.v1-workspace__main') ?? this.document.scrollingElement; }
  restoreScroll(scroll: number): void { const container = this.scrollContainer(); if (container) container.scrollTop = scroll; }
  clear(): void { this.token = undefined; }
  available(accountGuid: string): boolean {
    return this.token?.session === this.workspace.sessionRevision() && this.token?.accountGuid === accountGuid && this.workspace.account()?.guid === accountGuid
      && parseWorkspaceRoute(this.router.url).visualizationGuid === this.token.chartGuid;
  }
  async return(accountGuid: string): Promise<boolean | undefined> {
    if (!this.available(accountGuid)) return undefined;
    const token = this.token!, account = this.workspace.account()!;
    const valid = token.owner.kind === 'account' ? token.owner.guid === accountGuid && presentedHomeOwner(account, this.workspace.facilities())?.kind === 'account'
      : this.workspace.facilities().some(item => item.accountId === accountGuid && item.guid === token.owner.guid);
    const owner = valid ? token.owner : presentedHomeOwner(account, this.workspace.facilities());
    if (!owner) return this.router.navigate(['/v1']);
    const resolved = this.resolver.resolve(owner), original = valid ? resolved.entries.find(entry => entry.available && homeViewKey(entry.reference) === homeViewKey(token.reference)) : undefined;
    const fallback = resolved.default && resolved.entries.find(entry => homeViewKey(entry.reference) === homeViewKey(resolved.default!));
    const destination = original ?? fallback;
    const request = { ownerKey: homeOwnerKey(accountGuid, owner), reference: destination?.reference,
      ...(original ? { widgetId: token.widgetId } : {}), scroll: original ? token.scroll : 0 };
    this.focus.set(request);
    const opened = await this.router.navigate(destination?.route ?? homeOwnerRoute(owner));
    if (!opened && this.focus() === request) this.focus.set(undefined);
    return opened;
  }
}
