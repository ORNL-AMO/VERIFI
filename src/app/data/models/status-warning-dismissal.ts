/** Account-owned record of one discarded v1 status-warning occurrence. */
export interface StatusWarningDismissal {
  readonly findingId: string;
  readonly evidenceSignature: string;
  readonly discardedAt: string;
}
