import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgModule, Pipe, PipeTransform, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SustainabilityQuestions } from '@data/models/sustainabilityQuestions';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { SustainabilityQuestionsFormComponent } from './sustainability-questions-form.component';

@Pipe({ name: 'yearDisplay', standalone: false })
export class YearDisplayPipeStub implements PipeTransform {
  transform(value: number, _fiscalYear?: string): number {
    return value;
  }
}

@Pipe({ name: 'yearOptions', standalone: false })
export class YearOptionsPipeStub implements PipeTransform {
  transform(years: Array<number>, _baselineYear?: number): Array<number> {
    return years;
  }
}

@NgModule({
  declarations: [SustainabilityQuestionsFormComponent, YearDisplayPipeStub, YearOptionsPipeStub],
  imports: [CommonModule, ReactiveFormsModule]
})
export class SustainabilityQuestionsFormTestModule { }

describe('SustainabilityQuestionsFormComponent', () => {
  let account: IdbAccount;
  let facility: IdbFacility;
  let fixture: ComponentFixture<SustainabilityQuestionsFormComponent>;
  let component: SustainabilityQuestionsFormComponent;
  let execute: ReturnType<typeof vi.fn>;
  let updateFacility: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    account = buildAccount();
    facility = buildFacility();
    updateFacility = vi.fn(async (updated: IdbFacility) => updated);
    execute = vi.fn(async (_metadata, persist: () => Promise<unknown>) => ({
      value: await persist(),
      change: {}
    }));

    TestBed.configureTestingModule({
      imports: [SustainabilityQuestionsFormTestModule],
      providers: [
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal(account),
            selectedFacility: signal(facility)
          }
        },
        { provide: WorkspaceCommandBoundary, useValue: { execute } },
        { provide: FacilityCommandHandler, useValue: { update: updateFacility } },
        { provide: AccountCommandHandler, useValue: { update: vi.fn() } },
        { provide: ApplicationLifecycleService, useValue: { refreshAccountCatalog: vi.fn() } }
      ]
    });
  });

  it('clears and persists the new-facility flag when the energy baseline matches the account', async () => {
    createComponent();
    component.form.controls['energyReductionBaselineYear'].setValue(2020);

    await component.saveChanges();

    expectPersistedFacility({
      isNewFacility: false,
      sustainabilityQuestions: expect.objectContaining({ energyReductionBaselineYear: 2020 })
    });
    expect(component.form.controls['isNewFacility'].value).toBe(false);
    expect(component.canMarkAsNewFacility).toBe(false);
  });

  it('clears the new-facility flag when the energy baseline is earlier than the account baseline', async () => {
    createComponent();
    component.form.controls['energyReductionBaselineYear'].setValue(2019);

    await component.saveChanges();

    expectPersistedFacility({ isNewFacility: false });
    expect(component.canMarkAsNewFacility).toBe(false);
  });

  it('allows a later energy baseline to persist the selected new-facility flag', async () => {
    facility.isNewFacility = false;
    createComponent();
    expect(fixture.nativeElement.querySelector('#isNewFacility')).not.toBeNull();
    component.form.controls['isNewFacility'].setValue(true);

    await component.saveChanges();

    expectPersistedFacility({ isNewFacility: true });
    expect(component.canMarkAsNewFacility).toBe(true);
  });

  it('ignores other sustainability differences when the energy baseline is not later', async () => {
    facility.sustainabilityQuestions.energyReductionBaselineYear = 2020;
    facility.sustainabilityQuestions.waterReductionBaselineYear = 2024;
    facility.sustainabilityQuestions.greenhouseReductionPercent = 30;
    facility.isNewFacility = true;
    createComponent();

    await component.saveChanges();

    expect(component.sustainQuestionsDontMatchAccount).toBe(true);
    expectPersistedFacility({ isNewFacility: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#isNewFacility')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('check the "This is a new facility" box below');
  });

  it('clears the flag when account sustainability answers are restored', async () => {
    createComponent();

    await component.setAccountSustainQuestions();

    expectPersistedFacility({
      isNewFacility: false,
      sustainabilityQuestions: account.sustainabilityQuestions
    });
    expect(component.sustainQuestionsDontMatchAccount).toBe(false);
  });

  it('does not write or repair an already-stale record while loading the form', () => {
    facility.sustainabilityQuestions = structuredClone(account.sustainabilityQuestions);
    facility.isNewFacility = true;

    createComponent();

    expect(execute).not.toHaveBeenCalled();
    expect(updateFacility).not.toHaveBeenCalled();
    expect(facility.isNewFacility).toBe(true);
    expect(component.canMarkAsNewFacility).toBe(false);
  });

  it('does not mutate the workspace facility when persistence fails', async () => {
    createComponent();
    const originalFacility = structuredClone(facility);
    component.form.controls['energyReductionBaselineYear'].setValue(2020);
    component.form.controls['waterReductionPercent'].setValue(45);
    updateFacility.mockRejectedValueOnce(new Error('persist failed'));

    await expect(component.saveChanges()).rejects.toThrow('persist failed');

    expect(facility).toEqual(originalFacility);
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(SustainabilityQuestionsFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inAccount', false);
    fixture.detectChanges();
  }

  function expectPersistedFacility(expected: object): void {
    expect(updateFacility).toHaveBeenCalledTimes(1);
    expect(updateFacility).toHaveBeenCalledWith(expect.objectContaining(expected), account.guid);
  }
});

function buildAccount(): IdbAccount {
  return {
    id: 1,
    guid: 'account-a',
    name: 'Account A',
    archiveOption: 'skip',
    displayEmissions: false,
    fiscalYear: 'calendarYear',
    sustainabilityQuestions: buildSustainabilityQuestions()
  } as IdbAccount;
}

function buildFacility(): IdbFacility {
  return {
    id: 2,
    guid: 'facility-a',
    accountId: 'account-a',
    name: 'Facility A',
    fiscalYear: 'calendarYear',
    isNewFacility: true,
    sustainabilityQuestions: buildSustainabilityQuestions({
      energyReductionBaselineYear: 2021,
      energyReductionTargetYear: 2031
    })
  } as IdbFacility;
}

function buildSustainabilityQuestions(overrides: Partial<SustainabilityQuestions> = {}): SustainabilityQuestions {
  return {
    energyReductionGoal: true,
    energyReductionPercent: 25,
    energyReductionBaselineYear: 2020,
    energyReductionTargetYear: 2030,
    energyIsAbsolute: false,
    greenhouseReductionGoal: false,
    greenhouseReductionPercent: 0,
    greenhouseReductionBaselineYear: 2020,
    greenhouseReductionTargetYear: 2030,
    greenhouseIsAbsolute: true,
    waterReductionGoal: true,
    waterReductionPercent: 20,
    waterReductionBaselineYear: 2020,
    waterReductionTargetYear: 2030,
    waterIsAbsolute: false,
    ...overrides
  };
}
