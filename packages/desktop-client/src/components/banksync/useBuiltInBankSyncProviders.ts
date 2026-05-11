import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  BankSyncProviders,
} from '@actual-app/core/types/models';

import { useAuth } from '#auth/AuthProvider';
import { Permissions } from '#auth/types';
import { useMultiuserEnabled } from '#components/ServerContext';
import { usePlaidStatus } from '#hooks/usePlaidStatus';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { BUILT_IN_BANK_SYNC_PROVIDERS } from './bankSyncUtils';

type ProviderAction = () => void | Promise<void>;

export type BuiltInBankSyncProviderState = {
  id: BankSyncProviders;
  displayName: string;
  description: string;
  isConfigured: boolean;
  canConfigure: boolean;
  isLoading?: boolean;
  onConfigure: ProviderAction;
  onLink: ProviderAction;
  onReset: ProviderAction;
};

type SecretSetResponse = {
  error?: string;
  error_code?: string;
  reason?: string;
};

type UseBuiltInBankSyncProvidersOptions = {
  upgradingAccountId?: AccountEntity['id'];
};

async function ensureSuccessResponse(
  response: SecretSetResponse,
  fallbackMessage: string,
) {
  if (response.error_code) {
    throw new Error(response.reason || response.error_code);
  }

  if (response.error) {
    throw new Error(response.reason || response.error || fallbackMessage);
  }
}

export function useBuiltInBankSyncProviders({
  upgradingAccountId,
}: UseBuiltInBankSyncProvidersOptions = {}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const syncServerStatus = useSyncServerStatus();
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const canConfigureProviders =
    !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR);

  const [isPlaidSetupComplete, setIsPlaidSetupComplete] = useState<
    boolean | null
  >(null);

  const { configuredPlaid } = usePlaidStatus();

  useEffect(() => {
    setIsPlaidSetupComplete(configuredPlaid);
  }, [configuredPlaid]);

  const notifyResetFailure = useCallback(
    (providerName: string, error: unknown) => {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: t('Failed to reset {{provider}}', {
              provider: providerName,
            }),
            message: error instanceof Error ? error.message : String(error),
            timeout: 5000,
          },
        }),
      );
    },
    [dispatch, t],
  );

  const onPlaidInit = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'plaid-init',
          options: {
            onSuccess: () => setIsPlaidSetupComplete(true),
          },
        },
      }),
    );
  }, [dispatch]);

  const onPlaidReset = useCallback(async () => {
    try {
      for (const { name, fallbackMessage } of [
        {
          name: 'plaid_client_id',
          fallbackMessage: 'Failed to clear Plaid client ID',
        },
        {
          name: 'plaid_secret',
          fallbackMessage: 'Failed to clear Plaid secret',
        },
        {
          name: 'plaid_env',
          fallbackMessage: 'Failed to clear Plaid environment',
        },
        {
          name: 'plaid_item_ids',
          fallbackMessage: 'Failed to clear Plaid item IDs',
        },
      ]) {
        await ensureSuccessResponse(
          await send('secret-set', {
            name,
            value: null,
          }),
          fallbackMessage,
        );
      }

      setIsPlaidSetupComplete(false);
    } catch (error) {
      notifyResetFailure('Plaid', error);
    }
  }, [notifyResetFailure]);

  const onConnectPlaid = useCallback(() => {
    if (!isPlaidSetupComplete) {
      onPlaidInit();
      return;
    }

    dispatch(
      pushModal({
        modal: {
          name: 'plaid-link',
          options: {
            upgradingAccountId,
            onSuccess: () => setIsPlaidSetupComplete(true),
          },
        },
      }),
    );
  }, [dispatch, isPlaidSetupComplete, onPlaidInit, upgradingAccountId]);

  const providers = useMemo<BuiltInBankSyncProviderState[]>(
    () =>
      BUILT_IN_BANK_SYNC_PROVIDERS.map(providerId => ({
        id: providerId,
        displayName: 'Plaid',
        description: t(
          'Link a US bank or credit card account to automatically download transactions.',
        ),
        isConfigured: Boolean(isPlaidSetupComplete),
        canConfigure: canConfigureProviders,
        onConfigure: onPlaidInit,
        onLink: onConnectPlaid,
        onReset: onPlaidReset,
      })),
    [
      canConfigureProviders,
      isPlaidSetupComplete,
      onConnectPlaid,
      onPlaidInit,
      onPlaidReset,
      t,
    ],
  );

  const providersNeedingConfiguration = providers.filter(
    provider => !provider.isConfigured,
  );

  return {
    providers,
    syncServerStatus,
    canConfigureProviders,
    showPermissionWarning:
      providersNeedingConfiguration.length > 0 && !canConfigureProviders,
    providersNeedingConfiguration,
  };
}
