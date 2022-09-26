import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeHelpComponent } from './welcome-help.component';

describe('WelcomeHelpComponent', () => {
  let component: WelcomeHelpComponent;
  let fixture: ComponentFixture<WelcomeHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WelcomeHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
