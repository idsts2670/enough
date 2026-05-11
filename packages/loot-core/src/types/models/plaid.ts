export type SyncServerPlaidAccount = {
  balance: number;
  account_id: string;
  institution?: string;
  orgDomain?: string | null;
  orgId?: string;
  name: string;
  official_name?: string;
  mask?: string;
};
