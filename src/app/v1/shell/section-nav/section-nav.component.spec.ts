import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { SectionNavComponent } from './section-nav.component';

describe('SectionNavComponent', () => {
  let activeSection: ReturnType<typeof signal<string>>;

  beforeEach(() => {
    activeSection = signal('home');
    TestBed.configureTestingModule({
      declarations: [SectionNavComponent],
      imports: [RouterModule.forRoot([])],
      providers: [
        {
          provide: WorkspaceNavigationService,
          useValue: {
            contextMode: signal('account'),
            facilities: signal([]),
            facility: signal(undefined),
            account: signal({ guid: 'account-a', name: 'Account A' }),
            activeSection,
            activeDetail: signal('profile'),
            accountRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'home', 'overview'],
            facilityRoute: () => ['/v1', 'workspace', 'facility', 'facility-a', 'home', 'overview'],
            accountSettingsRoute: (_accountGuid: string, detail = 'profile') => ['/v1', 'workspace', 'account', 'account-a', 'settings', detail],
            setContext: () => undefined
          }
        }
      ]
    });
  });

  it('shows home navigation only when the Home rail section is active', () => {
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Home');
    expect(fixture.nativeElement.textContent).toContain('Overview');
    expect(fixture.nativeElement.textContent).not.toContain('Account Settings');
  });

  it('shows account settings navigation only when the Settings rail section is active', () => {
    activeSection.set('settings');
    const fixture = TestBed.createComponent(SectionNavComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account Settings');
    expect(fixture.nativeElement.textContent).toContain('Profile');
    expect(fixture.nativeElement.textContent).toContain('Delete account');
    expect(fixture.nativeElement.textContent).not.toContain('Account Home');
    expect(fixture.nativeElement.textContent).not.toContain('Overview');
  });
});
