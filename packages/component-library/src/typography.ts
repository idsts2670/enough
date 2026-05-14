import type { CSSProperties } from './styles';

export const fontFamilyApp =
  "var(--font-family), 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const fontSize = 'fontSize';
const fontWeight = 'fontWeight';
const letterSpacing = 'letterSpacing';

export const display2xl: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 32,
  [fontWeight]: 600,
  lineHeight: 1.15,
  [letterSpacing]: 0,
};

export const displayXl: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 24,
  [fontWeight]: 600,
  lineHeight: 1.2,
  [letterSpacing]: 0,
};

export const displayLg: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 20,
  [fontWeight]: 600,
  lineHeight: 1.3,
  [letterSpacing]: 0,
};

export const titleMd: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 16,
  [fontWeight]: 600,
  lineHeight: 1.35,
  [letterSpacing]: 0,
};

export const bodyMd: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 15,
  [fontWeight]: 400,
  lineHeight: 1.45,
  [letterSpacing]: 0,
};

export const bodyStrong: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 15,
  [fontWeight]: 500,
  lineHeight: 1.45,
  [letterSpacing]: 0,
};

export const bodySm: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 13,
  [fontWeight]: 400,
  lineHeight: 1.4,
  [letterSpacing]: 0,
};

export const caption: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 12,
  [fontWeight]: 500,
  lineHeight: 1.35,
  [letterSpacing]: 0,
};

export const buttonText: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 15,
  [fontWeight]: 600,
  lineHeight: 1,
  [letterSpacing]: 0,
};

export const tabularFigure: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"ss01", "ss04", "tnum"',
};

export const pageHeader: CSSProperties = {
  ...display2xl,
};

export const metricTitle: CSSProperties = {
  ...displayLg,
};

export const metricSubtitle: CSSProperties = {
  ...bodySm,
};

export const metricValue: CSSProperties = {
  ...displayXl,
  ...tabularFigure,
};

export const tableCellLabel: CSSProperties = {
  ...bodySm,
};

export const tableCellAmount: CSSProperties = {
  ...bodySm,
  ...tabularFigure,
  textAlign: 'right',
};

export const chartLabel: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 12,
  [fontWeight]: 500,
  [letterSpacing]: 0,
};

export const chartValue: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 13,
  [fontWeight]: 500,
  [letterSpacing]: 0,
  ...tabularFigure,
};

export const chartAxis: CSSProperties = {
  fontFamily: fontFamilyApp,
  [fontSize]: 12,
  [fontWeight]: 500,
  [letterSpacing]: 0,
};
