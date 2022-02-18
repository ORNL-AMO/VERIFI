import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupConfirmationComponent } from './setup-confirmation.component';

describe('SetupConfirmationComponent', () => {
  let component: SetupConfirmationComponent;
  let fixture: ComponentFixture<SetupConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetupConfirmationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
