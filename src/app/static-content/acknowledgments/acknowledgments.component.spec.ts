import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AcknowledgmentsComponent } from './acknowledgments.component';

describe('AcknowledgmentsComponent', () => {
  let component: AcknowledgmentsComponent;
  let fixture: ComponentFixture<AcknowledgmentsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AcknowledgmentsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AcknowledgmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
