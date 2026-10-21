/** Shared downstream-impact wording for analysis cards and workbench status. */
export function analysisDependencyMessage(
  accountAnalysisCount: number,
  reportCount: number,
  bankingConsumerCount: number
): string | undefined {
  const dependencies = [
    dependencyCountLabel(accountAnalysisCount, 'account analysis', 'account analyses'),
    dependencyCountLabel(reportCount, 'report', 'reports'),
    dependencyCountLabel(bankingConsumerCount, 'banking consumer', 'banking consumers')
  ].filter((label): label is string => !!label);

  if (!dependencies.length) return undefined;
  if (dependencies.length === 1) return `Changes can affect ${dependencies[0]}.`;
  if (dependencies.length === 2) return `Changes can affect ${dependencies[0]} and ${dependencies[1]}.`;
  return `Changes can affect ${dependencies[0]}, ${dependencies[1]}, and ${dependencies[2]}.`;
}

function dependencyCountLabel(count: number, singular: string, plural: string): string | undefined {
  if (!count) return undefined;
  return `${count} ${count === 1 ? singular : plural}`;
}
