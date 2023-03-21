import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartupErrorComponent } from './startup-error.component';

describe('StartupErrorComponent', () => {
  let component: StartupErrorComponent;
  let fixture: ComponentFixture<StartupErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StartupErrorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartupErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
