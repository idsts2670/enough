import { keyframes } from '@emotion/css';

import { theme } from './theme';
import { tokens } from './tokens';

// oxlint-disable-next-line typescript/no-explicit-any
export type CSSProperties = Record<string, any>;

const MOBILE_MIN_HEIGHT = 40;

const shadowLarge = {
  boxShadow: '0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)',
};

export const styles: CSSProperties = {
  incomeHeaderHeight: 70,
  cardShadow: '0 12px 30px rgba(12, 10, 9, 0.1)',
  monthRightPadding: 5,
  menuBorderRadius: 4,
  mobileMinHeight: MOBILE_MIN_HEIGHT,
  mobileMenuItem: {
    fontSize: 17,
    fontWeight: 400,
    paddingTop: 8,
    paddingBottom: 8,
    height: MOBILE_MIN_HEIGHT,
    minHeight: MOBILE_MIN_HEIGHT,
  },
  mobileEditingPadding: 12,
  altMenuMaxHeight: 250,
  altMenuText: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  altMenuHeaderText: {
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  veryLargeText: {
    fontFamily: 'var(--font-display)',
    fontSize: 36,
    fontWeight: 300,
    lineHeight: 1.17,
    letterSpacing: -0.36,
  },
  largeText: {
    fontSize: 20,
    fontWeight: 500,
    lineHeight: 1.35,
    letterSpacing: 0,
  },
  mediumText: {
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  smallText: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  verySmallText: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  tinyText: {
    fontSize: 10,
  },
  page: {
    flex: 1,
    '@media (max-height: 550px)': {
      minHeight: 700, // ensure we can scroll on small screens
    },
    paddingTop: 8, // height of the titlebar
    [`@media (min-width: ${tokens.breakpoint_small})`]: {
      paddingTop: 36,
    },
  },
  pageContent: {
    paddingLeft: 2,
    paddingRight: 2,
    [`@media (min-width: ${tokens.breakpoint_small})`]: {
      paddingLeft: 20,
      paddingRight: 20,
    },
  },
  settingsPageContent: {
    padding: 20,
    [`@media (min-width: ${tokens.breakpoint_small})`]: {
      padding: 'inherit',
    },
  },
  staticText: {
    cursor: 'default',
    userSelect: 'none',
  },
  shadow: {
    boxShadow: '0 8px 20px rgba(12, 10, 9, 0.08)',
  },
  shadowLarge,
  tnum: {
    // tnum: Tabular numbers
    // ss01: Open digits
    // ss04: Disambiguation w/o zero
    fontFeatureSettings: '"tnum", "ss01", "ss04"',
  },
  notFixed: { fontFeatureSettings: '' },
  text: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0.16,
  },
  delayedFadeIn: {
    animationName: keyframes({
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    }),
    animationDuration: '1s',
    animationFillMode: 'both',
    animationDelay: '0.5s',
  },
  underlinedText: {
    borderBottom: `2px solid`,
  },
  noTapHighlight: {
    WebkitTapHighlightColor: 'transparent',
    ':focus': {
      outline: 'none',
    },
  },
  lineClamp: (lines: number) => {
    return {
      display: '-webkit-box',
      WebkitLineClamp: lines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      wordBreak: 'break-word',
    };
  },
  tooltip: {
    padding: 5,
    ...shadowLarge,
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: 'solid',
    borderColor: theme.tooltipBorder,
    backgroundColor: theme.tooltipBackground,
    color: theme.tooltipText,
    overflow: 'auto',
  },
  popover: {
    border: 'none',
    backgroundColor: theme.menuBackground,
    color: theme.menuItemText,
  },
  // Dynamically set
  horizontalScrollbar: null as CSSProperties | null,
  lightScrollbar: null as CSSProperties | null,
  darkScrollbar: null as CSSProperties | null,
  scrollbarWidth: null as number | null,
  editorPill: {
    color: theme.pillText,
    backgroundColor: theme.pillBackground,
    borderRadius: 4,
    padding: '3px 5px',
  },
  mobileListItem: {
    borderBottom: `1px solid ${theme.tableBorder}`,
    backgroundColor: theme.tableBackground,
    padding: 16,
    cursor: 'pointer',
  },
  tableContainer: {
    flex: 1,
    border: '1px solid ' + theme.tableBorder,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
};
