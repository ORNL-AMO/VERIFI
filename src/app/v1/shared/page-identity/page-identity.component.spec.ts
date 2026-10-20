import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageIdentityComponent } from './page-identity.component';

describe('page identity', () => {
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
