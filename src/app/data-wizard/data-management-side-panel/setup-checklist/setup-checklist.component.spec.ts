import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupChecklistComponent } from './setup-checklist.component';

describe('SetupChecklistComponent', () => {
  let component: SetupChecklistComponent;
  let fixture: ComponentFixture<SetupChecklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SetupChecklistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupChecklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
