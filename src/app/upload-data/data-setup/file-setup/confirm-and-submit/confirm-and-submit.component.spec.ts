import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmAndSubmitComponent } from './confirm-and-submit.component';

describe('ConfirmAndSubmitComponent', () => {
  let component: ConfirmAndSubmitComponent;
  let fixture: ComponentFixture<ConfirmAndSubmitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmAndSubmitComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmAndSubmitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
