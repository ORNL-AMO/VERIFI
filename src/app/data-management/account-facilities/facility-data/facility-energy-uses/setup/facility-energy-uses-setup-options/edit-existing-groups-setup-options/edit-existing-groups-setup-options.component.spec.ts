import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditExistingGroupsSetupOptionsComponent } from './edit-existing-groups-setup-options.component';

describe('EditExistingGroupsSetupOptionsComponent', () => {
  let component: EditExistingGroupsSetupOptionsComponent;
  let fixture: ComponentFixture<EditExistingGroupsSetupOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditExistingGroupsSetupOptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditExistingGroupsSetupOptionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
