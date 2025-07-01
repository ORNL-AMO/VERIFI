import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessMetersComponent } from './process-meters.component';

describe('ProcessMetersComponent', () => {
  let component: ProcessMetersComponent;
  let fixture: ComponentFixture<ProcessMetersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProcessMetersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessMetersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
