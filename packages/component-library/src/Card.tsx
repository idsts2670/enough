import { forwardRef } from 'react';
import type { ComponentProps } from 'react';

import { theme } from './theme';
import { View } from './View';

type CardProps = ComponentProps<typeof View>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, ...props }, ref) => {
    return (
      <View
        {...props}
        ref={ref}
        style={{
          marginTop: 15,
          marginLeft: 5,
          marginRight: 5,
          borderRadius: 8,
          backgroundColor: theme.cardBackground,
          border: '1px solid ' + theme.cardBorder,
          boxShadow: '0 12px 30px ' + theme.cardShadow,
          ...props.style,
        }}
      >
        <View
          style={{
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {children}
        </View>
      </View>
    );
  },
);

Card.displayName = 'Card';
