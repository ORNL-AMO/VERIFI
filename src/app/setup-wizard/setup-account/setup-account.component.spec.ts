import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupAccountComponent } from './setup-account.component';

describe('SetupAccountComponent', () => {
  let component: SetupAccountComponent;
  let fixture: ComponentFixture<SetupAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetupAccountComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
