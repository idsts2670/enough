import type { ChangeEvent, ReactNode } from 'react';
import {
  ColorPicker as AriaColorPicker,
  ColorSwatch as AriaColorSwatch,
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorField,
  ColorSwatchPickerItem,
  Dialog,
  DialogTrigger,
  parseColor,
} from 'react-aria-components';
import type {
  ColorPickerProps as AriaColorPickerProps,
  ColorSwatchProps,
} from 'react-aria-components';

import { css } from '@emotion/css';

import { Input } from './Input';
import { Popover } from './Popover';

function ColorSwatch(props: ColorSwatchProps) {
  return (
    <AriaColorSwatch
      {...props}
      style={({ color }) => ({
        background: color.toString('hex'),
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
      })}
    />
  );
}

const DEFAULT_COLOR_SET = [
  '#0c0a09',
  '#292524',
  '#4e4e4e',
  '#777169',
  '#a8a29e',
  '#d6d3d1',
  '#e7e5e4',
  '#f0efed',
  '#f5f5f5',
  '#ffffff',
  '#a7e5d3',
  '#f4c5a8',
  '#c8b8e0',
  '#a8c8e8',
  '#e8b8c4',
  '#16a34a',
  '#147d64',
  '#dc2626',
  '#b88115',
  '#f0efed',
];

type ColorSwatchPickerProps = {
  columns?: number;
  colorset?: string[];
};

function ColorSwatchPicker({
  columns = 5,
  colorset = DEFAULT_COLOR_SET,
}: ColorSwatchPickerProps) {
  const pickers = [];

  for (let l = 0; l < colorset.length / columns; l++) {
    const pickerItems = [];

    for (let c = 0; c < columns; c++) {
      const color = colorset[columns * l + c];
      if (!color) {
        break;
      }

      pickerItems.push(
        <ColorSwatchPickerItem
          key={color}
          color={color}
          className={css({
            position: 'relative',
            outline: 'none',
            borderRadius: '4px',
            width: 'fit-content',
            forcedColorAdjust: 'none',
            cursor: 'pointer',

            '&[data-selected]::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              border: '2px solid black',
              outline: '2px solid white',
              outlineOffset: '-4px',
              borderRadius: 'inherit',
            },
          })}
        >
          <ColorSwatch />
        </ColorSwatchPickerItem>,
      );
    }

    pickers.push(
      <AriaColorSwatchPicker
        key={`colorset-${l}`}
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {pickerItems}
      </AriaColorSwatchPicker>,
    );
  }

  return pickers;
}
const isColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

type ColorPickerProps = {
  children?: ReactNode;
  columns?: number;
  colorset?: string[];
} & AriaColorPickerProps;

export function ColorPicker({
  children,
  columns,
  colorset,
  ...props
}: ColorPickerProps) {
  const onInput = (value: string) => {
    if (!isColor(value)) {
      return;
    }

    const color = parseColor(value);
    if (color) {
      props.onChange?.(color);
    }
  };

  return (
    <AriaColorPicker defaultValue={props.defaultValue ?? '#292524'} {...props}>
      <DialogTrigger>
        {children}
        <Popover>
          <Dialog
            style={{
              outline: 'none',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '192px',
              maxHeight: 'inherit',
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
          >
            <ColorSwatchPicker columns={columns} colorset={colorset} />
            <ColorField
              onInput={({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
                onInput(value)
              }
            >
              <Input placeholder="#RRGGBB" style={{ width: '100px' }} />
            </ColorField>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}
