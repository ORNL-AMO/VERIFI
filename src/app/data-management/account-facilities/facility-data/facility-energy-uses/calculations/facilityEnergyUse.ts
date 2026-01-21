import { FormGroup } from "@angular/forms";
import { EnergySources, MeterSource } from "src/app/models/constantsAndTypes";

export function getIncludedSources(form: FormGroup): Array<{
    source: MeterSource, controlName: string
}> {
    let sources: Array<{
        source: MeterSource, controlName: string
    }> = EnergySources.map(source => { return { source: source, controlName: source.replace(/\s+/g, '_') }; });
    let includedSources: Array<{
        source: MeterSource, controlName: string
    }> = [];
    for (let source of sources) {
        if (form.contains('utilityData_' + source.controlName)) {
            includedSources.push(source);
        }
    }
    return includedSources;
}