import type { ReactNode } from 'react';

import { AutoSizer } from 'react-virtualized-auto-sizer';

import { View } from '@actual-app/components/view';

type ChartContainerProps = {
  minHeight?: number;
  style?: React.CSSProperties;
  children: (size: { width: number; height: number }) => ReactNode;
};

export function ChartContainer({
  minHeight = 160,
  style,
  children,
}: ChartContainerProps) {
  return (
    <View style={{ minWidth: 0, height: minHeight, ...style }}>
      <AutoSizer
        renderProp={({ width = 0, height = 0 }) =>
          width > 0 && height > 0 ? children({ width, height }) : null
        }
      />
    </View>
  );
}
