// @ts-strict-ignore
import React from 'react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { bodySm, tableCellAmount } from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';

import { CellValue } from '#components/spreadsheet/CellValue';
import type { Binding, SheetFields } from '#spreadsheet';

type BudgetTotalProps<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
> = {
  title: ReactNode;
  current: Binding<'tracking-budget', CurrentField>;
  target: Binding<'tracking-budget', TargetField>;
  ProgressComponent: ComponentType<{ current; target }>;
  style?: CSSProperties;
};
export function BudgetTotal<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
>({
  title,
  current,
  target,
  ProgressComponent,
  style,
}: BudgetTotalProps<CurrentField, TargetField>) {
  return (
    <View
      style={{
        ...bodySm,
        lineHeight: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        ...style,
      }}
    >
      <ProgressComponent current={current} target={target} />

      <View style={{ marginLeft: 10, ...tableCellAmount }}>
        <View>
          <Text style={{ color: theme.pageTextLight }}>{title}</Text>
        </View>

        <Text>
          <Trans
            i18nKey="<allocatedAmount /> <italic>of <totalAmount /></italic>"
            components={{
              allocatedAmount: <CellValue binding={current} type="financial" />,
              italic: (
                <Text
                  style={{ color: theme.pageTextLight, fontStyle: 'italic' }}
                />
              ),
              totalAmount: <CellValue binding={target} type="financial" />,
            }}
          />
        </Text>
      </View>
    </View>
  );
}
