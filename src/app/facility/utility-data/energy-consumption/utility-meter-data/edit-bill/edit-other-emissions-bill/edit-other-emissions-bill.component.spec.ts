import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOtherEmissionsBillComponent } from './edit-other-emissions-bill.component';

describe('EditOtherEmissionsBillComponent', () => {
  let component: EditOtherEmissionsBillComponent;
  let fixture: ComponentFixture<EditOtherEmissionsBillComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditOtherEmissionsBillComponent]
    });
    fixture = TestBed.createComponent(EditOtherEmissionsBillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
