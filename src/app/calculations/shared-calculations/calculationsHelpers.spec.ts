import { AnalysisGroup, AnalysisGroupPredictorVariable } from "src/app/models/analysis";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import {
    getIncludedAnalysisInputIds,
    getLatestCompleteAnalysisYear
} from "./calculationsHelpers";

describe("getLatestCompleteAnalysisYear", () => {
    const facility = getFacility("facility-1");

    it("uses an individual meter's latest complete year", () => {
        const meter = getCalanderizedMeter(
            "meter-1",
            "group-1",
            facility.guid,
            [
                ...getCalendarYearDates(2023),
                ...getCalendarYearDates(2024).slice(0, 11)
            ]
        );

        expect(getLatestCompleteAnalysisYear(
            [getGroup("group-1")],
            [meter],
            [],
            [facility]
        )).toBe(2023);
    });

    it("takes the minimum latest complete year across included meters and predictors", () => {
        const firstMeter = getCalanderizedMeter(
            "meter-1",
            "group-1",
            facility.guid,
            [...getCalendarYearDates(2023), ...getCalendarYearDates(2024)]
        );
        const secondMeter = getCalanderizedMeter(
            "meter-2",
            "group-1",
            facility.guid,
            [...getCalendarYearDates(2023), ...getCalendarYearDates(2024).slice(0, 10)]
        );
        const predictorVariable = getPredictorVariable("predictor-1");
        const predictorData = [
            ...getPredictorData("predictor-1", facility.guid, 2023, 12),
            ...getPredictorData("predictor-1", facility.guid, 2024, 11)
        ];

        expect(getLatestCompleteAnalysisYear(
            [getGroup("group-1", "energyIntensity", [predictorVariable])],
            [firstMeter, secondMeter],
            predictorData,
            [facility]
        )).toBe(2023);
    });

    it("lets an included predictor limit an otherwise complete meter year", () => {
        const meter = getCalanderizedMeter(
            "meter-1",
            "group-1",
            facility.guid,
            [...getCalendarYearDates(2023), ...getCalendarYearDates(2024)]
        );
        const predictorVariable = getPredictorVariable("predictor-1");

        expect(getLatestCompleteAnalysisYear(
            [getGroup("group-1", "energyIntensity", [predictorVariable])],
            [meter],
            [
                ...getPredictorData("predictor-1", facility.guid, 2023, 12),
                ...getPredictorData("predictor-1", facility.guid, 2024, 11)
            ],
            [facility]
        )).toBe(2023);
    });

    it("uses only included group inputs and the selected generated model predictors", () => {
        const activeMeter = getCalanderizedMeter(
            "active-meter",
            "active-group",
            facility.guid,
            getCalendarYearDates(2024)
        );
        const skippedMeter = getCalanderizedMeter(
            "skipped-meter",
            "skipped-group",
            facility.guid,
            getCalendarYearDates(2023)
        );
        const selectedPredictor = getPredictorVariable("selected-predictor");
        const unusedPredictor = getPredictorVariable("unused-predictor");
        const generatedGroup = getGroup("active-group", "regression", [unusedPredictor]);
        generatedGroup.isGeneratedModel = true;
        generatedGroup.selectedModelId = "selected-model";
        generatedGroup.models = [
            {
                modelId: "selected-model",
                predictorVariables: [selectedPredictor]
            } as any,
            {
                modelId: "unused-model",
                predictorVariables: [unusedPredictor]
            } as any
        ];
        const skippedGroup = getGroup("skipped-group", "skip", [unusedPredictor]);

        const includedIds = getIncludedAnalysisInputIds(
            [generatedGroup, skippedGroup],
            [activeMeter, skippedMeter]
        );

        expect(includedIds.includedMeterIds).toEqual(["active-meter"]);
        expect(includedIds.includedPredictorIds).toEqual(["selected-predictor"]);
        expect(getLatestCompleteAnalysisYear(
            [generatedGroup, skippedGroup],
            [activeMeter, skippedMeter],
            [
                ...getPredictorData("selected-predictor", facility.guid, 2024, 12),
                ...getPredictorData("unused-predictor", facility.guid, 2023, 12)
            ],
            [facility]
        )).toBe(2024);
    });

    it("does not let inputs from another group limit a group result", () => {
        const selectedGroupMeter = getCalanderizedMeter(
            "selected-meter",
            "selected-group",
            facility.guid,
            getCalendarYearDates(2024)
        );
        const otherGroupMeter = getCalanderizedMeter(
            "other-meter",
            "other-group",
            facility.guid,
            getCalendarYearDates(2023)
        );

        expect(getLatestCompleteAnalysisYear(
            [getGroup("selected-group")],
            [selectedGroupMeter, otherGroupMeter],
            [],
            [facility]
        )).toBe(2024);
    });

    it("uses facility fiscal-year settings for meters and predictors", () => {
        const fiscalFacility = getFacility("fiscal-facility", "nonCalendarYear", 6, true);
        const fiscalYear2024Dates = [
            ...Array.from({ length: 6 }, (_, month) => new Date(2023, month + 6, 1)),
            ...Array.from({ length: 6 }, (_, month) => new Date(2024, month, 1))
        ];
        const meter = getCalanderizedMeter(
            "fiscal-meter",
            "fiscal-group",
            fiscalFacility.guid,
            fiscalYear2024Dates
        );
        const predictorVariable = getPredictorVariable("fiscal-predictor");
        const predictorData = fiscalYear2024Dates.map((date, index) =>
            getPredictorEntry("fiscal-predictor", fiscalFacility.guid, date, index)
        );

        expect(getLatestCompleteAnalysisYear(
            [getGroup("fiscal-group", "energyIntensity", [predictorVariable])],
            [meter],
            predictorData,
            [fiscalFacility]
        )).toBe(2024);
    });

    it("ignores an included input with no complete year", () => {
        const completeMeter = getCalanderizedMeter(
            "complete-meter",
            "group-1",
            facility.guid,
            getCalendarYearDates(2024)
        );
        const incompleteMeter = getCalanderizedMeter(
            "incomplete-meter",
            "group-1",
            facility.guid,
            getCalendarYearDates(2024).slice(0, 11)
        );

        expect(getLatestCompleteAnalysisYear(
            [getGroup("group-1")],
            [completeMeter, incompleteMeter],
            [],
            [facility]
        )).toBe(2024);
        expect(getLatestCompleteAnalysisYear(
            [getGroup("group-1")],
            [incompleteMeter],
            [],
            [facility]
        )).toBeUndefined();
    });
});

function getFacility(
    guid: string,
    fiscalYear: "calendarYear" | "nonCalendarYear" = "calendarYear",
    fiscalYearMonth = 0,
    fiscalYearCalendarEnd = true
): IdbFacility {
    return {
        guid,
        fiscalYear,
        fiscalYearMonth,
        fiscalYearCalendarEnd
    } as IdbFacility;
}

function getGroup(
    idbGroupId: string,
    analysisType: AnalysisGroup["analysisType"] = "absoluteEnergyConsumption",
    predictorVariables: Array<AnalysisGroupPredictorVariable> = []
): AnalysisGroup {
    return {
        idbGroupId,
        analysisType,
        predictorVariables,
        isGeneratedModel: false
    } as AnalysisGroup;
}

function getPredictorVariable(id: string): AnalysisGroupPredictorVariable {
    return {
        id,
        name: id,
        production: true,
        productionInAnalysis: true,
        regressionCoefficient: 1,
        unit: "units"
    };
}

function getCalendarYearDates(year: number): Array<Date> {
    return Array.from({ length: 12 }, (_, month) => new Date(year, month, 1));
}

function getCalanderizedMeter(
    guid: string,
    groupId: string,
    facilityId: string,
    dates: Array<Date>
): CalanderizedMeter {
    return {
        meter: {
            guid,
            groupId,
            facilityId,
            noLongerInUse: false
        },
        monthlyData: dates.map(date => ({
            date,
            year: date.getFullYear(),
            monthNumValue: date.getMonth()
        } as MonthlyData))
    } as CalanderizedMeter;
}

function getPredictorData(
    predictorId: string,
    facilityId: string,
    year: number,
    monthCount: number
): Array<IdbPredictorData> {
    return Array.from({ length: monthCount }, (_, month) =>
        getPredictorEntry(predictorId, facilityId, new Date(year, month, 1), month)
    );
}

function getPredictorEntry(
    predictorId: string,
    facilityId: string,
    date: Date,
    index: number
): IdbPredictorData {
    return {
        guid: `${predictorId}-${date.getFullYear()}-${date.getMonth()}-${index}`,
        predictorId,
        facilityId,
        year: date.getFullYear(),
        month: date.getMonth() + 1
    } as IdbPredictorData;
}
