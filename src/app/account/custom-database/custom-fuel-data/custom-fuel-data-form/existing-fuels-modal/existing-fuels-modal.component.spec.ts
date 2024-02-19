import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExistingFuelsModalComponent } from './existing-fuels-modal.component';

describe('ExistingFuelsModalComponent', () => {
  let component: ExistingFuelsModalComponent;
  let fixture: ComponentFixture<ExistingFuelsModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExistingFuelsModalComponent]
    });
    fixture = TestBed.createComponent(ExistingFuelsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
