/// <reference lib="webworker" />

import { AnnualGroupAnalysisWASM } from "./classes/wasm-api/annualGroupAnalysisWASM";
import { MonthlyGroupAnalysisWASM } from "./classes/wasm-api/monthlyGroupAnalysisWASM";

// declare var Module: any;
addEventListener('message', ({ data }) => {

    console.log('MESSAGE RECEIVED')
    console.log(data);
    if (data.type == 'initialize') {
        console.log('initialize')
        self['Module'] = {
            onRuntimeInitialized: function () {
                console.log('WASM Initialized 2222');
                console.log(self['Module']);
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
    } else if(data.type == 'annualGroupAnalysis'){
        let calculation = new AnnualGroupAnalysisWASM(self['Module'],
            data.input.group,
            data.input.analysisItem,
            data.input.facility,
            data.input.calanderizedMeters,
            data.input.accountPredictorEntries);
        data.results = calculation.annualAnalysisSummary;
        postMessage(data);
    }
});
