# Phase 1 Brand Audit

Status: initial pass complete.

Scope follows `PLAN.md` section 10: remove user-visible "Actual" branding while keeping internal compatibility identifiers intact.

## Updated User-Facing Copy

- Welcome and onboarding:
  - `packages/desktop-client/src/components/manager/WelcomeScreen.tsx`
  - `packages/desktop-client/src/components/manager/subscribe/Bootstrap.tsx`
  - `packages/desktop-client/src/components/manager/subscribe/Login.tsx`
- Fatal/error and update copy:
  - `packages/desktop-client/src/components/FatalError.tsx`
  - `packages/desktop-client/src/components/FinancesApp.tsx`
  - `packages/desktop-client/src/components/modals/OutOfSyncMigrationsModal.tsx`
  - `packages/desktop-client/src/sync-events.ts`
  - `packages/loot-core/src/shared/errors.ts`
- Server and bank sync copy:
  - `packages/desktop-client/src/components/manager/ConfigServer.tsx`
  - `packages/desktop-client/src/components/banksync/BuiltInProviders.tsx`
  - `packages/desktop-client/src/components/banksync/FieldMapping.tsx`
  - `packages/desktop-client/src/components/modals/SelectLinkedAccountsModal.tsx`
- Settings, import, export, and account empty states:
  - `packages/desktop-client/src/components/settings/index.tsx`
  - `packages/desktop-client/src/components/settings/Backups.tsx`
  - `packages/desktop-client/src/components/settings/Export.tsx`
  - `packages/desktop-client/src/components/settings/Encryption.tsx`
  - `packages/desktop-client/src/components/modals/CreateEncryptionKeyModal.tsx`
  - `packages/desktop-client/src/components/modals/manager/ImportActualModal.tsx`
  - `packages/desktop-client/src/components/modals/manager/ImportModal.tsx`
  - `packages/desktop-client/src/components/modals/manager/ImportYNAB5Modal.tsx`
  - `packages/desktop-client/src/components/modals/manager/FilesSettingsModal.tsx`
  - `packages/desktop-client/src/components/modals/manager/ConfirmChangeDocumentDir.tsx`
  - `packages/desktop-client/src/components/accounts/AccountEmptyMessage.tsx`
  - `packages/desktop-client/src/components/mobile/accounts/AccountsPage.tsx`
  - `packages/desktop-client/src/components/mobile/transactions/TransactionEdit.tsx`
  - `packages/desktop-client/src/budgetfiles/budgetfilesSlice.ts`

## Remaining Intentional `Actual` References

These are intentionally retained for now:

- `window.Actual`, `global.Actual`, and `globalThis.window.Actual`: preload/runtime bridge names.
- `@actual-app/*`: package names and import aliases.
- `ActualQL`: internal query naming.
- `importActual`, `ImportActualModal`, and file import type `"actual"`: compatibility names for the existing export/import format.
- `x-actual-*`, `application/actual-sync`, `Actual-Budget-Plugin-System`: sync/protocol/plugin compatibility identifiers.
- `ACTUAL_*` environment variables: existing server configuration contract.
- `Actual` default document directory in `loot-core/src/server/main.ts`: compatibility storage path; changing it needs migration/backward-compat work.
- Comments and test fixture strings that do not render to end users.

## Locale Strategy

The app uses natural-language English strings as i18n keys. This pass updates English source keys directly to "Enough". Non-English locale fan-out is deferred; until translations are regenerated, English fallback copy is acceptable for v0.

If Phase 1 later introduces a central `appName` translation key, do it deliberately across all touched copy. Do not mix a half-migrated `t('appName')` approach with natural-language keys unless the extraction pipeline is updated at the same time.
