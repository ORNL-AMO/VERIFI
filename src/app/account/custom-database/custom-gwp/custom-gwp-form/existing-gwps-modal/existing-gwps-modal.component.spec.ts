import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExistingGwpsModalComponent } from './existing-gwps-modal.component';

describe('ExistingGwpsModalComponent', () => {
  let component: ExistingGwpsModalComponent;
  let fixture: ComponentFixture<ExistingGwpsModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExistingGwpsModalComponent]
    });
    fixture = TestBed.createComponent(ExistingGwpsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
