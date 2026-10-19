import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { cdp, page, userEvent } from 'vitest/browser';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { BrowseStateService } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { account, facility, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { inventoryPredictor, inventoryReading, inventoryNavigation } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.testing';
import { AccountDataModule } from '../../account-data.module';
import { AccountPortfolioComponent } from '../account-portfolio.component';
import { AccountPortfolioFacilitiesTabComponent } from '../account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from '../account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPredictorsTabComponent } from '../account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { PortfolioResource } from '../portfolio-inventory.models';
import { PORTFOLIO_PALETTES, textContrast } from '../portfolio-browser-test.helpers';

@Component({ standalone: true, imports: [RouterOutlet], template: '<main class="v1-root" style="height:600px;min-height:0;overflow:auto;width:100%"><div><router-outlet/></div></main>' })
class InventoryBrowserHost { }
@Component({ standalone: true, template: '<h1>Resource settings</h1>' })
class ResourceDestination { }

function setup(count = 260) {
  const facilities = signal(Array.from({ length: count > 24 ? 64 : 3 }, (_, index) => facility({ guid: `f${index}`, name: `Plant ${String(index).padStart(2,'0')}`, city: 'Oak Ridge', state: 'TN' })));
  const owner = (index: number) => facilities()[index < 40 ? 0 : index * 7 % facilities().length].guid;
  const meters = signal(Array.from({ length: count }, (_, index) => meter({ guid: `m${index}`, facilityId: owner(index), name: `Meter ${String(index).padStart(3,'0')}${index===0?' — A long manufacturing process and packaging line name':''}`, source: index % 2 ? 'Natural Gas' : 'Electricity', groupId: 'g' })));
  const predictors = signal(Array.from({ length: count }, (_, index) => inventoryPredictor(`p${index}`, { accountId: account().guid, facilityId: owner(index), name: `Predictor ${String(index).padStart(3,'0')}`, ...(index % 3 ? {} : { predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago', weatherDataType: 'HDD', heatingBaseTemperature: 65, unit: 'HDD' }) })));
  const findings = presentFindings(meters().slice(0,3).map((item,index) => makeFinding('meter.configuration.invalid', index===0?'error':'warning', 'configuration', { kind: 'meter', guid: item.guid, name: item.name, accountGuid: account().guid, facilityGuid: item.facilityId })));
  const workspace = { account: signal(account()), facilities, meters, meterData: signal(meters().map(item => reading({ meterId: item.guid, facilityId: item.facilityId }))),
    meterGroups: signal(facilities().map(item => group({ guid:'g', facilityId:item.guid }))), predictors, predictorData: signal(predictors().map(item => inventoryReading(item.guid, { accountId: account().guid, facilityId: item.facilityId }))),
    facilityAnalyses: signal([]), accountAnalyses: signal([]), facilityReports: signal([]), energyUseEquipment: signal([]), canWrite: signal(true), hasPending: signal(false) };
  const active = signal<PortfolioResource>('meters'); const stored = new Map<string,unknown>();
  const routes = [{ path: 'portfolio', component: AccountPortfolioComponent, children: [
    { path:'facilities', component:AccountPortfolioFacilitiesTabComponent }, { path:'meters', component:AccountPortfolioMetersTabComponent }, { path:'predictors', component:AccountPortfolioPredictorsTabComponent }
  ] }, { path:'v1/workspace/facility/:facility/data/meters/:meter/settings', component:ResourceDestination },
    { path:'v1/workspace/facility/:facility/data/predictors/weather/:key/setup', component:ResourceDestination }];
  TestBed.configureTestingModule({ imports:[AccountDataModule, InventoryBrowserHost], providers:[provideRouter(routes),
    { provide:AccountWorkspaceStore, useValue:workspace }, { provide:WorkspaceStatusService, useValue:{ state:signal('ready'), items:signal(findings) } },
    { provide:WorkspaceNavigationService, useValue:{ ...inventoryNavigation, activePortfolioTab:active, facilityMeterRoute:(facility:string,guid:string,tab:string)=>['/v1','workspace','facility',facility,'data','meters',guid,tab] } },
    { provide:ModalPortalService, useValue:{ show:vi.fn(), hide:vi.fn() } },
    { provide:LocalStorageService, useValue:{ retrieve:(key:string)=>stored.get(key), store:(key:string,value:unknown)=>stored.set(key,value) } }
  ] });
  const fixture = TestBed.createComponent(InventoryBrowserHost); fixture.detectChanges();
  const router = TestBed.inject(Router), root = fixture.nativeElement.querySelector('main') as HTMLElement;
  const open = async(resource:PortfolioResource) => {
    active.set(resource); await router.navigateByUrl(`/portfolio/${resource}`); fixture.detectChanges(); await fixture.whenStable(); await settled(root);
    const type = resource === 'facilities' ? AccountPortfolioFacilitiesTabComponent : resource === 'meters' ? AccountPortfolioMetersTabComponent : AccountPortfolioPredictorsTabComponent;
    await vi.waitFor(() => { fixture.detectChanges(); expect(fixture.debugElement.query(By.directive(type)).componentInstance.browseReady()).toBe(true); });
    await fixture.whenStable();
  };
  return { fixture, root, router, open, workspace };
}
async function settled(root: HTMLElement) {
  await vi.waitFor(() => {
    const items = root.querySelectorAll<HTMLElement>('.portfolio-inventory > li');
    expect(items.length).toBeGreaterThan(0);
    const uniform = root.querySelector('.portfolio-inventory')!.classList.contains('portfolio-inventory--uniform');
    expect([...items].every(item => uniform ? item.style.gridRowEnd === '' : item.style.gridRowEnd.startsWith('span '))).toBe(true);
    const articles = [...root.querySelectorAll<HTMLElement>('.portfolio-inventory .portfolio-tile')];
    for(let index=1;index<articles.length;index++) {
      const prev=articles[index-1].getBoundingClientRect(), next=articles[index].getBoundingClientRect();
      expect(next.top>prev.top-.5 || (Math.abs(next.top-prev.top)<.5 && next.left>prev.left)).toBe(true);
    }
  });
}

describe('uniform account inventories in Chromium', () => {
  it('aligns rows around wrapped facility names and gives pagination an opaque themed surface', async () => {
    await page.viewport(850,1000);
    const {fixture,root,open,workspace}=setup();
    workspace.facilities.update(items=>items.map((item,index)=>({ ...item, name:`Plant ${String(index).padStart(2,'0')}${index===4?' — Reedsburg Greenway Manufacturing and Distribution Center with a long facility name':''}` })));
    await open('facilities');
    await vi.waitFor(()=>{
      const grid=root.querySelector<HTMLElement>('.portfolio-inventory')!;
      const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
      expect(columns).toBe(3);
      const tiles=[...grid.querySelectorAll<HTMLElement>('.portfolio-tile')];
      expect(tiles[4].querySelector('.portfolio-tile__name')!.getBoundingClientRect().height).toBeGreaterThan(tiles[3].querySelector('.portfolio-tile__name')!.getBoundingClientRect().height);
      for(let row=0;row<3;row++) {
        const first=tiles[row*columns].getBoundingClientRect();
        for(const tile of tiles.slice(row*columns,row*columns+columns)) {
          const rect=tile.getBoundingClientRect();
          expect(rect.top).toBeCloseTo(first.top,0);
          expect(rect.bottom).toBeCloseTo(first.bottom,0);
        }
        if(row>0) expect(first.top-tiles[(row-1)*columns].getBoundingClientRect().bottom).toBeCloseTo(12,0);
      }
    });
    const pager=root.querySelector<HTMLElement>('.portfolio-pagination')!;
    const background=getComputedStyle(pager).backgroundColor;
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(background).not.toBe('transparent');
    expect(parseFloat(getComputedStyle(pager).paddingLeft)).toBeGreaterThan(0);
    await page.screenshot({element:root,path:'../../../../../../../.angular/account-inventory-long-names.png'});
    fixture.destroy();
  });
  it('packs expanded tiles in sorted order, centers Simple identity, and supports themed keyboard/right-click menus without navigating', async () => {
    await page.viewport(1500,1000); const {fixture,root,open,router}=setup(); await open('meters');
    const articles=()=>[...root.querySelectorAll<HTMLElement>('.portfolio-inventory .portfolio-tile')];
    expect(articles()).toHaveLength(24); expect(root.textContent).toContain('Showing 260 of 260 meters');
    const toolbar=root.querySelector<HTMLElement>('.portfolio-inventory-toolbar')!;
    const search=toolbar.querySelector<HTMLElement>('.v1-portfolio-browse-search')!;
    for(const field of toolbar.querySelectorAll<HTMLElement>(':scope > label')) expect(field.getBoundingClientRect().bottom).toBeCloseTo(search.getBoundingClientRect().bottom,0);
    const title=articles()[0].querySelector<HTMLElement>('.portfolio-tile__name')!, icon=articles()[0].querySelector<HTMLElement>('.portfolio-tile__heading app-ui-icon')!;
    const center=articles()[0].getBoundingClientRect();
    expect(Math.abs((title.getBoundingClientRect().left+title.getBoundingClientRect().right)/2-(center.left+center.right)/2)).toBeLessThan(4);
    expect(icon.querySelector('svg')!.getAttribute('width')).toBe('32'); expect(articles()[0].querySelector('.portfolio-tile__owner app-ui-icon')).not.toBeNull();
    const before=root.querySelectorAll('.portfolio-inventory .portfolio-tile__name').length;
    const menuButton=articles()[0].querySelector<HTMLButtonElement>('button')!; menuButton.click(); fixture.detectChanges();
    await page.getByRole('menuitemradio',{name:'Detailed',exact:true}).click(); fixture.detectChanges(); await settled(root);
    expect(router.url).toBe('/portfolio/meters'); expect(articles()[0].dataset['detail']).toBe('detailed');
    expect(articles()[0].getBoundingClientRect().width).toBeGreaterThan(articles()[1].getBoundingClientRect().width*1.7);
    expect(root.querySelectorAll('.portfolio-inventory .portfolio-tile__name')).toHaveLength(before); expect(document.activeElement).toBe(menuButton);
    const context=new MouseEvent('contextmenu',{bubbles:true,cancelable:true}); articles()[1].dispatchEvent(context); fixture.detectChanges(); expect(context.defaultPrevented).toBe(true);
    await vi.waitFor(()=>expect(document.querySelector('[role="menu"]')).not.toBeNull()); await userEvent.keyboard('{Escape}'); fixture.detectChanges();
    expect(document.activeElement).toBe(articles()[1].querySelector('button'));
    const link=articles()[1].querySelector('a')!; const native=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});link.dispatchEvent(native);expect(native.defaultPrevented).toBe(false);
    link.focus(); await userEvent.keyboard('{Shift>}{F10}{/Shift}'); fixture.detectChanges();
    await vi.waitFor(()=>expect(document.querySelector('[role="menu"]')).not.toBeNull()); await userEvent.keyboard('{Escape}'); fixture.detectChanges();
    for(const palette of PORTFOLIO_PALETTES) for(const dark of [false,true]) for(const contrast of [false,true]) {
      root.className=`v1-root v1-palette-${palette}${dark?' v1-theme-dark':''}${contrast?' v1-contrast-strong':''}`;
      for(const article of articles().slice(0,4)) {
        expect(textContrast(article)).toBeGreaterThanOrEqual(4.5);
        const status=article.querySelector<HTMLElement>('.portfolio-tile__status')!;
        status.style.backgroundColor=getComputedStyle(article).backgroundColor;
        expect(textContrast(status), `${palette}, dark=${dark}, contrast=${contrast}, ${status.textContent}`).toBeGreaterThanOrEqual(4.5);status.style.backgroundColor='';
      }
    }
    root.className='v1-root v1-theme-dark v1-contrast-strong'; menuButton.click(); fixture.detectChanges();
    await vi.waitFor(()=>expect(document.querySelector('.portfolio-tile-menu.v1-theme-dark.v1-contrast-strong')).not.toBeNull());
    const menu=document.querySelector<HTMLElement>('.portfolio-tile-menu')!; expect(textContrast(menu)).toBeGreaterThanOrEqual(4.5);
    const rect=menu.getBoundingClientRect(); expect(rect.bottom).toBeLessThanOrEqual(1000); expect(rect.left).toBeGreaterThanOrEqual(0);
    await userEvent.keyboard('{Escape}'); fixture.detectChanges(); root.className='v1-root';
    await page.screenshot({element:root,path:'../../../../../../../.angular/account-inventory-tiles.png'});
    fixture.destroy();
  });
  it('restores the page, individual expansion, scroll and originating focus after drill-in and cancelled navigation', async () => {
    await page.viewport(1400,1000); const {fixture,root,open,router}=setup();await open('meters');
    await page.getByRole('button',{name:'Next',exact:true}).click();fixture.detectChanges();await settled(root);
    const button=root.querySelector<HTMLButtonElement>('.portfolio-inventory > li:nth-child(4) button')!;button.click();fixture.detectChanges();
    await page.getByRole('menuitemradio',{name:'Summary',exact:true}).click();fixture.detectChanges();await settled(root);
    const target=root.querySelector<HTMLAnchorElement>('.portfolio-inventory > li:nth-child(4) .portfolio-tile__name')!;
    const id=target.dataset['browseId'];target.focus();root.scrollTop=400;
    await vi.waitFor(()=>{fixture.detectChanges();expect(getComputedStyle(root.querySelector('.v1-account-portfolio__sticky')!).paddingBottom).toBe('0px');});
    const position=root.scrollTop;expect(position).toBeGreaterThan(0);
    target.click();await fixture.whenStable();fixture.detectChanges();expect(router.url).toContain('/settings');
    await router.navigateByUrl('/portfolio/meters');fixture.detectChanges();await fixture.whenStable();await settled(root);
    await vi.waitFor(()=>{expect(root.textContent).toContain('Page 2 of 11');expect((document.activeElement as HTMLElement).dataset['browseId']).toBe(id);expect(root.scrollTop).toBeCloseTo(position,0);});
    expect(root.querySelector(`[data-browse-id="${id}"]`)?.closest('article')?.getAttribute('data-detail')).toBe('summary');
    const browse=TestBed.inject(BrowseStateService);expect(browse.readInventoryView({accountGuid:account().guid,kind:'meters'})?.page).toBe(1);
    const navigate=vi.spyOn(router,'navigate').mockResolvedValueOnce(false);(root.querySelector('.portfolio-inventory .portfolio-tile__name') as HTMLAnchorElement).click();await fixture.whenStable();
    expect(router.url).toBe('/portfolio/meters');expect(root.textContent).toContain('Page 2 of 11');navigate.mockRestore();
    fixture.destroy();
  });
  it('handles small/boundary inventories, each resource, detail changes, narrow layouts, sticky gaps, and all-result printing', async () => {
    await page.viewport(1500,1000);const {fixture,root,open,workspace}=setup(25);await open('facilities');
    expect(root.querySelectorAll('.portfolio-inventory .portfolio-tile')).toHaveLength(24);
    expect(root.querySelector('.portfolio-tile__location')?.textContent).toContain('Oak Ridge');
    workspace.facilities.update(items=>items.slice(0,24));fixture.detectChanges();await settled(root);expect(root.querySelector('.portfolio-pagination')).toBeNull();
    workspace.facilities.update(items=>items.slice(0,3));fixture.detectChanges();await settled(root);expect(root.querySelectorAll('.portfolio-inventory .portfolio-tile')).toHaveLength(3);
    for(const resource of ['meters','predictors'] as const) {
      await open(resource);expect(root.querySelectorAll('.portfolio-inventory .portfolio-tile')).toHaveLength(24);
      await page.getByRole('combobox',{name:'Detail level',exact:true}).selectOptions('summary');fixture.detectChanges();await settled(root);
      expect(root.querySelector('.portfolio-inventory .portfolio-tile__facts')).not.toBeNull();
      await page.getByRole('combobox',{name:'Detail level',exact:true}).selectOptions('detailed');fixture.detectChanges();await settled(root);
      expect(root.querySelector('.portfolio-inventory .portfolio-tile')?.getAttribute('data-detail')).toBe('detailed');
      await page.getByRole('combobox',{name:'Detail level',exact:true}).selectOptions('simple');fixture.detectChanges();await settled(root);
    }
    root.scrollTop=350;
    await vi.waitFor(()=>{fixture.detectChanges();expect(root.querySelector('header')!.getBoundingClientRect().bottom).toBeCloseTo(root.querySelector('.portfolio-inventory-toolbar')!.getBoundingClientRect().top,0);});
    root.scrollTop=0;await page.viewport(390,650);fixture.detectChanges();await settled(root);
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);expect(root.querySelector('.portfolio-inventory')!.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    expect(getComputedStyle(root.querySelector('.portfolio-inventory')!).gridTemplateColumns.split(' ')).toHaveLength(1);
    await page.screenshot({element:root,path:'../../../../../../../.angular/account-inventory-narrow.png'});
    const client=cdp() as {send(command:string,parameters:unknown):Promise<void>};await client.send('Emulation.setEmulatedMedia',{media:'print'});
    expect(getComputedStyle(root.querySelector('.portfolio-inventory')!).display).toBe('none');
    const printed=root.querySelector<HTMLElement>('.portfolio-inventory-print')!;expect(getComputedStyle(printed).display).toBe('grid');
    expect(printed.querySelectorAll('app-portfolio-tile')).toHaveLength(25);expect(printed.querySelector('button')).toBeNull();
    await client.send('Emulation.setEmulatedMedia',{media:''});fixture.destroy();await page.viewport(1500,1000);
  });
});
