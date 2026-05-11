import React from 'react';
import type { CSSProperties } from 'react';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';

import { reportCardMetricStyle } from './ReportCardMetric';

export function Change({
  amount,
  style,
  variant = 'inline',
}: {
  amount: number;
  style?: CSSProperties;
  variant?: 'inline' | 'card';
}) {
  const format = useFormat();

  return (
    <FinancialText
      as={Block}
      style={{
        ...(variant === 'card' ? reportCardMetricStyle : styles.smallText),
        color:
          amount === 0
            ? theme.reportsNumberNeutral
            : amount < 0
              ? theme.reportsNumberNegative
              : theme.reportsNumberPositive,
        ...style,
      }}
    >
      {amount >= 0 ? '+' : ''}
      {format(amount, 'financial')}
    </FinancialText>
  );
}
