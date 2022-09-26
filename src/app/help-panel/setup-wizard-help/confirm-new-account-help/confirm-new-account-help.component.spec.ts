import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmNewAccountHelpComponent } from './confirm-new-account-help.component';

describe('ConfirmNewAccountHelpComponent', () => {
  let component: ConfirmNewAccountHelpComponent;
  let fixture: ComponentFixture<ConfirmNewAccountHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmNewAccountHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmNewAccountHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
