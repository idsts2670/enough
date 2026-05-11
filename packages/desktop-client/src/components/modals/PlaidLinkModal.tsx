// @ts-strict-ignore
import React, { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { SyncServerPlaidAccount } from '@actual-app/core/types/models';

import { Error as AlertError } from '#components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { useServerURL } from '#components/ServerContext';
import { closeModal, pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type PlaidLinkModalProps = Extract<
  ModalType,
  { name: 'plaid-link' }
>['options'];

export const PlaidLinkModal = ({
  upgradingAccountId,
  relinkItemId,
  onSuccess,
}: PlaidLinkModalProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const serverUrl = useServerURL();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkSessionId, setLinkSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createLinkToken() {
      setIsLoading(true);

      try {
        const results = await send('plaid-create-link-token', {
          itemId: relinkItemId,
        });

        if (results.error) {
          throw new globalThis.Error(results.reason || results.error);
        }

        setLinkToken(results.link_token);
      } catch (error) {
        setError(
          error instanceof globalThis.Error ? error.message : String(error),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void createLinkToken();
  }, [relinkItemId]);

  const handleSuccess = useCallback(
    async (publicToken?: string) => {
      if (relinkItemId) {
        onSuccess?.();
        dispatch(closeModal());
        return;
      }

      if (!publicToken) {
        setError(t('Plaid did not return a public token.'));
        return;
      }

      setIsExchanging(true);

      try {
        const exchangeResult = await send('plaid-exchange-token', {
          publicToken,
        });

        if (exchangeResult.error) {
          throw new globalThis.Error(
            exchangeResult.reason || exchangeResult.error,
          );
        }

        const accountsResult = await send('plaid-accounts');

        if (accountsResult.error_code) {
          throw new globalThis.Error(
            accountsResult.reason || accountsResult.error_code,
          );
        }
        if (accountsResult.error) {
          throw new globalThis.Error(
            accountsResult.reason || accountsResult.error,
          );
        }

        onSuccess?.();
        dispatch(closeModal());
        dispatch(
          pushModal({
            modal: {
              name: 'select-linked-accounts',
              options: {
                externalAccounts:
                  accountsResult.accounts as SyncServerPlaidAccount[],
                syncSource: 'plaid',
                upgradingAccountId,
              },
            },
          }),
        );
      } catch (error) {
        setError(
          error instanceof globalThis.Error ? error.message : String(error),
        );
      } finally {
        setIsExchanging(false);
      }
    },
    [dispatch, onSuccess, relinkItemId, t, upgradingAccountId],
  );

  useEffect(() => {
    function handlePlaidResult(message: {
      status?: string;
      publicToken?: string;
      error?: {
        display_message?: string;
        error_message?: string;
        error_code?: string;
        request_id?: string;
      };
    }) {
      setIsOpening(false);

      if (message.status === 'success') {
        void handleSuccess(message.publicToken);
      } else if (message.status === 'error') {
        const plaidError = message.error;
        const details = [
          plaidError?.error_code,
          plaidError?.request_id ? `request_id: ${plaidError.request_id}` : '',
        ].filter(Boolean);
        const baseMessage =
          plaidError?.display_message ??
          plaidError?.error_message ??
          t('Plaid Link failed.');
        setError(
          details.length > 0
            ? `${baseMessage} (${details.join(', ')})`
            : baseMessage,
        );
      }
    }

    function handlePlaidMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const message = event.data;
      if (message?.type !== 'actual:plaid-link') {
        return;
      }

      handlePlaidResult(message);
    }

    window.addEventListener('message', handlePlaidMessage);
    return () => window.removeEventListener('message', handlePlaidMessage);
  }, [handleSuccess, t]);

  useEffect(() => {
    if (!linkSessionId || !isOpening) {
      return;
    }

    const storageKey = `actual:plaid-link:${linkSessionId}`;
    let stopped = false;

    function handleStoredResult() {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }

      window.localStorage.removeItem(storageKey);

      try {
        const message = JSON.parse(raw);
        setIsOpening(false);

        if (message.status === 'success') {
          void handleSuccess(message.publicToken);
        } else if (message.status === 'error') {
          const plaidError = message.error;
          setError(
            plaidError?.display_message ??
              plaidError?.error_message ??
              t('Plaid Link failed.'),
          );
        } else if (message.status === 'exit') {
          setIsOpening(false);
        }
      } catch {
        setIsOpening(false);
        setError(t('Plaid Link returned an unreadable response.'));
      }
    }

    const interval = window.setInterval(() => {
      if (!stopped) {
        handleStoredResult();
      }
    }, 500);
    const timeout = window.setTimeout(() => {
      if (!stopped) {
        setIsOpening(false);
        setError(t('Plaid Link timed out waiting for a response.'));
      }
    }, 5 * 60 * 1000);

    handleStoredResult();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [handleSuccess, isOpening, linkSessionId, t]);

  const openPlaidLink = useCallback(() => {
    if (!linkToken) {
      setError(t('Plaid link token is not ready yet.'));
      return;
    }

    const sessionId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    const storageKey = `actual:plaid-link:${sessionId}`;

    setError(null);
    setLinkSessionId(sessionId);
    setIsOpening(true);
    window.localStorage.removeItem(storageKey);

    const helperUrl = new URL('/plaid-link-helper', window.location.origin);
    helperUrl.hash = new URLSearchParams({
      token: linkToken,
      origin: window.location.origin,
      sessionId,
    }).toString();

    const popup = window.open(
      helperUrl.toString(),
      'actual-plaid-link',
      'popup,width=480,height=720',
    );

    if (!popup) {
      setIsOpening(false);
      setError(t('Plaid Link popup was blocked by the browser.'));
    }
  }, [linkToken, t]);

  return (
    <Modal name="plaid-link" containerProps={{ style: { width: 360 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={relinkItemId ? t('Reconnect Plaid') : t('Connect Plaid')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              {relinkItemId ? (
                <Trans>Reconnect this Plaid item to restore bank sync.</Trans>
              ) : (
                <Trans>Open Plaid Link to choose your accounts.</Trans>
              )}
            </Text>
            {error && <AlertError>{error}</AlertError>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading || isOpening || isExchanging}
              isDisabled={!serverUrl || !linkToken || Boolean(error)}
              onPress={openPlaidLink}
            >
              {relinkItemId ? (
                <Trans>Reconnect bank</Trans>
              ) : (
                <Trans>Open Plaid Link</Trans>
              )}
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
};
