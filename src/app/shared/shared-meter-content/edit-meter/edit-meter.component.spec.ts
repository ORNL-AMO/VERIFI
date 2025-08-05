import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMeterComponent } from './edit-meter.component';

describe('EditMeterComponent', () => {
  let component: EditMeterComponent;
  let fixture: ComponentFixture<EditMeterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditMeterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditMeterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
