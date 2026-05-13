import React from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import {
  bodySm,
  displayXl,
  tabularFigure,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useTrackingSheetValue } from '#components/budget/tracking/TrackingBudgetComponents';
import { makeAmountFullStyle } from '#components/budget/util';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { trackingBudget } from '#spreadsheet/bindings';

type SavedProps = {
  projected: boolean;
  style?: CSSProperties;
};
export function Saved({ projected, style }: SavedProps) {
  const { t } = useTranslation();
  const budgetedSaved =
    useTrackingSheetValue(trackingBudget.totalBudgetedSaved) || 0;
  const totalSaved = useTrackingSheetValue(trackingBudget.totalSaved) || 0;
  const format = useFormat();
  const saved = projected ? budgetedSaved : totalSaved;
  const isNegative = saved < 0;
  const diff = totalSaved - budgetedSaved;

  return (
    <View style={{ ...bodySm, alignItems: 'center', ...style }}>
      {projected ? (
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Projected savings:</Trans>
        </Text>
      ) : (
        <View style={{ color: theme.pageTextLight }}>
          {isNegative ? t('Overspent:') : t('Saved:')}
        </View>
      )}

      <Tooltip
        style={{ ...styles.tooltip, ...bodySm, padding: 10 }}
        content={
          <>
            <AlignedText
              left={t('Projected savings:')}
              right={
                <FinancialText style={makeAmountFullStyle(budgetedSaved)}>
                  {format(budgetedSaved, 'financial-with-sign')}
                </FinancialText>
              }
            />
            <AlignedText
              left={t('Difference:')}
              right={
                <FinancialText style={makeAmountFullStyle(diff)}>
                  {format(diff, 'financial-with-sign')}
                </FinancialText>
              }
            />
          </>
        }
        placement="bottom"
        triggerProps={{
          isDisabled: Boolean(projected),
        }}
      >
        <View
          className={css({
            ...displayXl,
            ...tabularFigure,
            color: projected
              ? theme.templateNumberUnderFunded
              : isNegative
                ? theme.budgetNumberNegative
                : theme.templateNumberFunded,
          })}
        >
          <PrivacyFilter>
            <FinancialText>{format(saved, 'financial')}</FinancialText>
          </PrivacyFilter>
        </View>
      </Tooltip>
    </View>
  );
}
