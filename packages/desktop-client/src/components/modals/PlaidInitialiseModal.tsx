// @ts-strict-ignore
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { getSecretsError } from '@actual-app/core/shared/errors';

import { Error } from '#components/alerts';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { FormField, FormLabel } from '#components/forms';
import type { Modal as ModalType } from '#modals/modalsSlice';

type PlaidInitialiseModalProps = Extract<
  ModalType,
  { name: 'plaid-init' }
>['options'];

export const PlaidInitialiseModal = ({
  onSuccess,
}: PlaidInitialiseModalProps) => {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [env, setEnv] = useState('production');
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    t('It is required to provide both the Plaid client ID and secret.'),
  );

  const onSubmit = async (close: () => void) => {
    if (!clientId || !secret) {
      setIsValid(false);
      setError(
        t('It is required to provide both the Plaid client ID and secret.'),
      );
      return;
    }

    setIsLoading(true);

    for (const { name, value } of [
      { name: 'plaid_client_id', value: clientId },
      { name: 'plaid_secret', value: secret },
      { name: 'plaid_env', value: env || 'production' },
    ]) {
      const { error, reason } =
        (await send('secret-set', {
          name,
          value,
        })) || {};

      if (error) {
        setIsLoading(false);
        setIsValid(false);
        setError(getSecretsError(error, reason));
        return;
      }
    }

    setIsValid(true);
    onSuccess();
    setIsLoading(false);
    close();
  };

  return (
    <Modal name="plaid-init" containerProps={{ style: { width: '30vw' } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Set up Plaid')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ display: 'flex', gap: 10 }}>
            <Text>
              <Trans>
                Enter your Plaid API credentials to connect US bank and credit
                card accounts.
              </Trans>
            </Text>

            <FormField>
              <FormLabel title={t('Client ID:')} htmlFor="plaid-client-id" />
              <InitialFocus>
                <Input
                  id="plaid-client-id"
                  type="text"
                  value={clientId}
                  onChangeValue={value => {
                    setClientId(value);
                    setIsValid(true);
                  }}
                />
              </InitialFocus>
            </FormField>

            <FormField>
              <FormLabel title={t('Secret:')} htmlFor="plaid-secret" />
              <Input
                id="plaid-secret"
                type="password"
                value={secret}
                onChangeValue={value => {
                  setSecret(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            <FormField>
              <FormLabel title={t('Environment:')} htmlFor="plaid-env" />
              <Input
                id="plaid-env"
                type="text"
                value={env}
                onChangeValue={value => {
                  setEnv(value);
                  setIsValid(true);
                }}
              />
            </FormField>

            {!isValid && <Error>{error}</Error>}
          </View>

          <ModalButtons>
            <ButtonWithLoading
              variant="primary"
              isLoading={isLoading}
              onPress={() => {
                void onSubmit(() => state.close());
              }}
            >
              <Trans>Save and continue</Trans>
            </ButtonWithLoading>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
};
