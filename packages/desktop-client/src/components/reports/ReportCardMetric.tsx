import React from 'react';
import type { ReactNode } from 'react';

import { Block } from '@actual-app/components/block';
import type { CSSProperties } from '@actual-app/components/styles';

import { FinancialText } from '#components/FinancialText';

export const REPORT_DISPLAY_MAX_FONT_SIZE = 48;

export function getReportDisplayLetterSpacing(fontSize: number) {
  if (fontSize >= 47) return -0.96;
  if (fontSize >= 36) return -0.36;
  if (fontSize >= 32) return -0.32;
  return 0;
}

export const reportCardMetricStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 24,
  fontWeight: 300,
  lineHeight: 1.2,
  letterSpacing: getReportDisplayLetterSpacing(24),
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
