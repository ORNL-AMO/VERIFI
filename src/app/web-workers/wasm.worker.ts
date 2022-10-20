/// <reference lib="webworker" />

import { AnnualAccountAnalysisWASM } from "./classes/wasm-api/annualAccountAnalysisWASM";
import { AnnualFacilityAnalysisWASM } from "./classes/wasm-api/annualFacilityAnalysisWASM";
import { AnnualGroupAnalysisWASM } from "./classes/wasm-api/annualGroupAnalysisWASM";
import { MonthlyAccountAnalysisWASM } from "./classes/wasm-api/monthlyAccountAnalysisWASM";
import { MonthlyFacilityAnalysisWASM } from "./classes/wasm-api/monthlyFacilityAnalysisWASM";
import { MonthlyGroupAnalysisWASM } from "./classes/wasm-api/monthlyGroupAnalysisWASM";

// declare var Module: any;
addEventListener('message', ({ data }) => {

    if (data.type == 'initialize') {
        self['Module'] = {
            onRuntimeInitialized: function () {
                data.results = 'INITIALIZED';
                postMessage(data);
            }
        }
        importScripts('wasm-analysis.js')
    } else if (data.type == 'monthlyGroupAnalysis') {
        let calculation = new MonthlyGroupAnalysisWASM(self['Module'],
            data.input.group,
            data.input.analysisItem,
            data.input.facility,
            data.input.calanderizedMeters,
            data.input.accountPredictorEntries);
        data.results = calculation.monthlyAnalysisSummaryData;
        postMessage(data);
    } else if (data.type == 'annualGroupAnalysis') {
        let calculation = new AnnualGroupAnalysisWASM(self['Module'],
            data.input.group,
            data.input.analysisItem,
            data.input.facility,
            data.input.calanderizedMeters,
            data.input.accountPredictorEntries);
        data.results = {
            annualAnalysisSummary: calculation.annualAnalysisSummary,
            monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData
        };
        postMessage(data);
    } else if (data.type == 'monthlyFacilityAnalysis') {
        let calculation = new MonthlyFacilityAnalysisWASM(
            self['Module'],
            data.input.analysisItem,
            data.input.facility,
            data.input.calanderizedMeters,
            data.input.accountPredictorEntries);
        data.results = calculation.monthlyAnalysisSummaryData;
        postMessage(data);
    } else if (data.type == 'annualFacilityAnalysis') {
        let calculation = new AnnualFacilityAnalysisWASM(
            self['Module'],
            data.input.analysisItem,
            data.input.facility,
            data.input.calanderizedMeters,
            data.input.accountPredictorEntries);
        data.results = {
            annualAnalysisSummary: calculation.annualAnalysisSummary,
            monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData
        };
        postMessage(data);
    } else if (data.type == 'monthlyAccountAnalysis') {
        let calculation = new MonthlyAccountAnalysisWASM(
            self['Module'],
            data.input.accountAnalysisItem,
            data.input.account,
            data.input.accountFacilities,
            data.input.calanderizedMeters,
            data.input.accountPredictorEntries,
            data.input.accountAnalysisItems);
        data.results = calculation.monthlyAnalysisSummaryData;
        postMessage(data);
    } else if (data.type == 'annualAccountAnalysis') {
        let calculation = new AnnualAccountAnalysisWASM(
            self['Module'],
            data.input.accountAnalysisItem,
            data.input.account,
            data.input.accountFacilities,
            data.input.calanderizedMeters,
            data.input.accountPredictorEntries,
            data.input.accountAnalysisItems);
        data.results = {
            annualAnalysisSummary: calculation.annualAnalysisSummary,
            monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData
        };
        postMessage(data);
    }
});
