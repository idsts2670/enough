import React from 'react';
import type { ReactNode } from 'react';

import { Block } from '@actual-app/components/block';
import type { CSSProperties } from '@actual-app/components/styles';
import { metricValue } from '@actual-app/components/typography';

import { FinancialText } from '#components/FinancialText';

export const REPORT_DISPLAY_MAX_FONT_SIZE = 48;

export function getReportDisplayLetterSpacing(_fontSize: number) {
  return 0;
}

export const reportCardMetricStyle: CSSProperties = {
  ...metricValue,
};

type ReportCardMetricProps = {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
};

export function ReportCardMetric({
  children,
  color,
  style,
}: ReportCardMetricProps) {
  return (
    <FinancialText
      as={Block}
      style={{
        ...reportCardMetricStyle,
        color,
        ...style,
      }}
    >
      {children}
    </FinancialText>
  );
}
