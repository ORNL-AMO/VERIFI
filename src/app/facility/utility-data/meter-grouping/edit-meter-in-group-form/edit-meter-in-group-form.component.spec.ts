import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMeterInGroupFormComponent } from './edit-meter-in-group-form.component';

describe('EditMeterInGroupFormComponent', () => {
  let component: EditMeterInGroupFormComponent;
  let fixture: ComponentFixture<EditMeterInGroupFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMeterInGroupFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditMeterInGroupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
