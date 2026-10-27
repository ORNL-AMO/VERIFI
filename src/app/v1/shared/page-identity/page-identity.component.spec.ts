import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { PageIdentityComponent, inventoryScopeBreadcrumbs } from './page-identity.component';

describe('page identity', () => {
  it('renders actionable inventory scope breadcrumbs without a redundant resource ancestor', () => {
    TestBed.configureTestingModule({ imports: [PageIdentityComponent] });
    const fixture = TestBed.createComponent(PageIdentityComponent);
    fixture.componentRef.setInput('breadcrumbs', inventoryScopeBreadcrumbs('Account A', 'Plant B'));
    fixture.componentRef.setInput('title', 'Meters'); fixture.componentRef.setInput('icon', 'meter'); fixture.componentRef.setInput('headingId', 'title');
    const selected = vi.fn(); fixture.componentInstance.breadcrumbSelected.subscribe(selected); fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('.page-identity__crumb')].map((item: HTMLElement) => item.textContent.trim())).toEqual(['Account A', 'Plant B']);
    expect(fixture.debugElement.query(By.css('nav')).queryAll(By.directive(IconComponent)).map(icon => icon.componentInstance.name)).toEqual(['account', 'chevronRight', 'facility']);
    fixture.nativeElement.querySelector('nav button').click(); expect(selected).toHaveBeenCalledWith('account');
    fixture.componentRef.setInput('breadcrumbs', inventoryScopeBreadcrumbs('Account A')); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.page-identity__crumb')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('nav').textContent).toContain('Account A');
    expect(fixture.nativeElement.querySelector('nav').textContent).not.toContain('Meters');
  });

  it('renders linked ancestors and a current resource heading without adding a duplicate Meters ancestor', () => {
    TestBed.configureTestingModule({ imports: [PageIdentityComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PageIdentityComponent);
    fixture.componentRef.setInput('breadcrumbs', [{ label: 'Account', route: ['/account'] }, { label: 'Plant', route: ['/plant/meters'] }]);
    fixture.componentRef.setInput('title', 'Main electric'); fixture.componentRef.setInput('icon', 'meter'); fixture.componentRef.setInput('headingId', 'title');
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('nav a')].map((link: HTMLAnchorElement) => link.getAttribute('href'))).toEqual(['/account', '/plant/meters']);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Main electric');
    expect(fixture.nativeElement.querySelector('nav').textContent).not.toContain('Meters');
  });
});
