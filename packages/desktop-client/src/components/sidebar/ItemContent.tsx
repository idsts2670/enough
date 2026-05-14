import React from 'react';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@actual-app/components/button';
import type { CSSProperties } from '@actual-app/components/styles';
import type { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

type ItemContentProps = {
  style: ComponentProps<typeof View>['style'];
  to: string;
  onClick: ComponentProps<typeof Button>['onPress'];
  activeStyle: CSSProperties;
  children: ReactNode;
  forceActive?: boolean;
  'aria-expanded'?: boolean;
};

export function ItemContent({
  style,
  to,
  onClick,
  activeStyle,
  forceActive,
  children,
  'aria-expanded': ariaExpanded,
}: ItemContentProps) {
  return onClick ? (
    <Button
      variant="bare"
      style={{
        justifyContent: 'flex-start',
        ...style,
        ...(forceActive ? activeStyle : {}),
      }}
      onPress={onClick}
      aria-expanded={ariaExpanded}
    >
      {children}
    </Button>
  ) : (
    <Link variant="internal" to={to} style={style} activeStyle={activeStyle}>
      {children}
    </Link>
  );
}
