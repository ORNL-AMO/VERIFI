import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMeterHelpComponent } from './edit-meter-help.component';

describe('EditMeterHelpComponent', () => {
  let component: EditMeterHelpComponent;
  let fixture: ComponentFixture<EditMeterHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditMeterHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMeterHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
