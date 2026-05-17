import { useEffect, useMemo, useState } from 'react';

import type { DarkTheme, Theme } from '@actual-app/core/types/prefs';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useGlobalPref } from '#hooks/useGlobalPref';

import {
  migrateLegacyOverride,
  parseInstalledTheme,
  validateThemeCss,
} from './customThemes';
import type { BaseTheme } from './customThemes';
import * as darkTheme from './themes/dark';
import * as lightTheme from './themes/light';
import * as midnightTheme from './themes/midnight';

const themes = {
  light: { name: 'Light', colors: lightTheme },
  dark: { name: 'Dark', colors: darkTheme },
  midnight: { name: 'Midnight', colors: midnightTheme },
  auto: { name: 'System default', colors: darkTheme },
} as const;

type ThemeKey = keyof typeof themes;

export const themeOptions = Object.entries(themes).map(
  ([key, { name }]) => [key, name] as [Theme, string],
);

export const darkThemeOptions = Object.entries({
  dark: themes.dark,
  midnight: themes.midnight,
}).map(([key, { name }]) => [key, name] as [DarkTheme, string]);

export function useTheme() {
  const [theme = 'auto', setThemePref] = useGlobalPref('theme');
  return [theme, setThemePref] as const;
}

export function usePreferredDarkTheme() {
  const [darkTheme = 'dark', setDarkTheme] =
    useGlobalPref('preferredDarkTheme');
  return [darkTheme, setDarkTheme] as const;
}

/**
 * One-time migration: moves any legacy `overrideCss` field out of the
 * installed theme JSON blobs and into the new `customCssOverride` global pref.
 * Gated on the customThemes feature flag — users who never used the feature
 * have nothing to migrate.
 *
 * TODO: remove this after v26.6.0 is released
 */
function useMigrateLegacyOverride() {
  const customThemesEnabled = useFeatureFlag('customThemes');
  const [customCssOverride, setCustomCssOverride] =
    useGlobalPref('customCssOverride');
  const [installedCustomLightThemeJson, setInstalledCustomLightThemeJson] =
    useGlobalPref('installedCustomLightTheme');
  const [installedCustomDarkThemeJson, setInstalledCustomDarkThemeJson] =
    useGlobalPref('installedCustomDarkTheme');

  useEffect(() => {
    if (!customThemesEnabled) return;

    const result = migrateLegacyOverride({
      existingOverride: customCssOverride,
      lightJson: installedCustomLightThemeJson,
      darkJson: installedCustomDarkThemeJson,
    });

    if (!result) return;

    setCustomCssOverride(result.override);
    if (result.newLightJson !== installedCustomLightThemeJson) {
      setInstalledCustomLightThemeJson(result.newLightJson);
    }
    if (result.newDarkJson !== installedCustomDarkThemeJson) {
      setInstalledCustomDarkThemeJson(result.newDarkJson);
    }
    // Re-runs when prefs hydrate so migration isn't missed if the installed
    // theme JSONs arrive after the first render. migrateLegacyOverride is
    // idempotent: once customCssOverride is set (or the legacy field is
    // stripped), subsequent invocations return null.
  }, [
    customThemesEnabled,
    customCssOverride,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
    setCustomCssOverride,
    setInstalledCustomLightThemeJson,
    setInstalledCustomDarkThemeJson,
  ]);
}

function getBaseThemeColors(baseTheme: BaseTheme) {
  return themes[baseTheme]?.colors;
}

export function ThemeStyle() {
  const [activeTheme] = useTheme();
  const [darkThemePreference] = usePreferredDarkTheme();
  const customThemesEnabled = useFeatureFlag('customThemes');
  const [installedCustomLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedCustomDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );
  const [themeColors, setThemeColors] = useState<
    typeof lightTheme | typeof darkTheme | typeof midnightTheme | undefined
  >(undefined);

  useEffect(() => {
    if (activeTheme === 'auto') {
      const installedLight = customThemesEnabled
        ? parseInstalledTheme(installedCustomLightThemeJson)
        : null;
      const installedDark = customThemesEnabled
        ? parseInstalledTheme(installedCustomDarkThemeJson)
        : null;

      const lightColors =
        (installedLight?.baseTheme &&
          getBaseThemeColors(installedLight.baseTheme)) ||
        themes['light'].colors;
      const darkColors =
        (installedDark?.baseTheme &&
          getBaseThemeColors(installedDark.baseTheme)) ||
        themes[darkThemePreference].colors;

      function darkThemeMediaQueryListener(event: MediaQueryListEvent) {
        if (event.matches) {
          setThemeColors(darkColors);
        } else {
          setThemeColors(lightColors);
        }
      }
      const darkThemeMediaQuery = window.matchMedia(
        '(prefers-color-scheme: dark)',
      );

      darkThemeMediaQuery.addEventListener(
        'change',
        darkThemeMediaQueryListener,
      );

      if (darkThemeMediaQuery.matches) {
        setThemeColors(darkColors);
      } else {
        setThemeColors(lightColors);
      }

      return () => {
        darkThemeMediaQuery.removeEventListener(
          'change',
          darkThemeMediaQueryListener,
        );
      };
    } else {
      const installedTheme = customThemesEnabled
        ? parseInstalledTheme(installedCustomLightThemeJson)
        : null;
      if (installedTheme?.baseTheme) {
        setThemeColors(
          getBaseThemeColors(installedTheme.baseTheme) ??
            themes[activeTheme as ThemeKey]?.colors,
        );
      } else {
        setThemeColors(themes[activeTheme as ThemeKey]?.colors);
      }
    }
  }, [
    activeTheme,
    darkThemePreference,
    customThemesEnabled,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
  ]);

  if (!themeColors) return null;

  const css = Object.entries(themeColors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n');
  return (
    <style>{`:root {
  --font-family: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: var(--font-family);
  --font-size-body-md: 15px;
  --font-size-button: 15px;
  --font-size-display-lg: 20px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --letter-spacing-normal: 0;
${css}
}

html,
body,
#root {
  background: var(--color-pageBackground);
}

body {
  color: var(--color-pageText);
  font-feature-settings: "ss01", "ss04", "tnum";
}`}</style>
  );
}

export function BrandStyle() {
  return (
    <style>{`:root {
  --font-family: 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: var(--font-family);
  --font-size-body-md: 15px;
  --font-size-button: 15px;
  --font-size-display-lg: 20px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --letter-spacing-normal: 0;
  --color-pageBackground: #f5f5f5;
  --color-pageBackgroundModalActive: #f0efed;
  --color-pageText: #0c0a09;
  --color-pageTextLight: #4e4e4e;
  --color-pageTextSubdued: #777169;
  --color-pageTextDark: #292524;
  --color-cardBackground: #ffffff;
  --color-cardBorder: #e7e5e4;
  --color-cardShadow: rgba(12, 10, 9, 0.10);
  --color-tableBackground: #ffffff;
  --color-tableHeaderBackground: #ffffff;
  --color-tableHeaderText: #4e4e4e;
  --color-tableBorder: #e7e5e4;
  --color-tableBorderHover: #a8a29e;
  --color-tableRowBackgroundHover: #fafafa;
  --color-sidebarBackground: #fafafa;
  --color-sidebarItemText: #4e4e4e;
  --color-sidebarItemTextSelected: #0c0a09;
  --color-sidebarItemBackgroundHover: #f0efed;
  --color-sidebarItemAccentSelected: #292524;
  --color-sidebarBudgetName: #0c0a09;
  --color-buttonPrimaryBackground: #292524;
  --color-buttonPrimaryBackgroundHover: #0c0a09;
  --color-buttonPrimaryBorder: #292524;
  --color-buttonNormalText: #0c0a09;
  --color-buttonNormalBackground: transparent;
  --color-buttonNormalBackgroundHover: #f0efed;
  --color-buttonNormalBorder: #d6d3d1;
  --color-formInputBackground: #ffffff;
  --color-formInputBorder: #d6d3d1;
  --color-formInputBorderSelected: #292524;
  --color-formInputText: #0c0a09;
}

html,
body,
#root,
[data-theme] {
  background: #f5f5f5 !important;
  color: #0c0a09;
  font-family: var(--font-family);
}

body,
input,
textarea,
select {
  font-family: var(--font-family) !important;
  font-size: var(--font-size-body-md);
  font-weight: var(--font-weight-regular);
  line-height: 1.45;
  letter-spacing: var(--letter-spacing-normal);
}

button {
  font-family: var(--font-family) !important;
  font-size: var(--font-size-button);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  letter-spacing: var(--letter-spacing-normal);
}

.brand-display {
  color: #0c0a09;
  font-family: var(--font-family) !important;
  font-weight: var(--font-weight-semibold) !important;
  letter-spacing: var(--letter-spacing-normal) !important;
}

.brand-title {
  color: #292524;
  font-family: var(--font-family) !important;
  font-size: var(--font-size-display-lg);
  font-weight: var(--font-weight-semibold);
  line-height: 1.3;
  letter-spacing: var(--letter-spacing-normal);
}

button {
  border-radius: 9999px;
}

::selection {
  background: #f4c5a8;
  color: #0c0a09;
}`}</style>
  );
}

/**
 * CustomThemeStyle injects CSS from the installed custom theme (if any).
 * This is rendered after ThemeStyle to allow custom themes to override base theme variables.
 *
 * When `theme === 'auto'`, separate custom themes can be set for light and dark modes,
 * injected via @media (prefers-color-scheme) rules. Otherwise, a single custom theme applies.
 */
export function CustomThemeStyle() {
  useMigrateLegacyOverride();
  const customThemesEnabled = useFeatureFlag('customThemes');
  const [activeTheme] = useTheme();
  const [installedCustomLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [installedCustomDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );
  const [customCssOverride] = useGlobalPref('customCssOverride');

  const validatedCss = useMemo(() => {
    if (!customThemesEnabled) return null;

    const safeValidate = (css: string | undefined, errorLabel: string) => {
      if (!css?.trim()) return '';
      try {
        return validateThemeCss(css);
      } catch (error) {
        console.error(errorLabel, { error });
        return '';
      }
    };

    let baseCss = '';
    if (activeTheme === 'auto') {
      const lightCss = safeValidate(
        parseInstalledTheme(installedCustomLightThemeJson)?.cssContent,
        'Invalid custom light theme CSS',
      );
      if (lightCss) {
        baseCss += `@media (prefers-color-scheme: light) { ${lightCss} }\n`;
      }
      const darkCss = safeValidate(
        parseInstalledTheme(installedCustomDarkThemeJson)?.cssContent,
        'Invalid custom dark theme CSS',
      );
      if (darkCss) {
        baseCss += `@media (prefers-color-scheme: dark) { ${darkCss} }\n`;
      }
    } else {
      baseCss = safeValidate(
        parseInstalledTheme(installedCustomLightThemeJson)?.cssContent,
        'Invalid custom theme CSS',
      );
    }

    const overrideLayer = safeValidate(
      customCssOverride,
      'Invalid custom CSS override',
    );

    const combined = [baseCss, overrideLayer].filter(Boolean).join('\n');
    return combined || null;
  }, [
    customThemesEnabled,
    activeTheme,
    installedCustomLightThemeJson,
    installedCustomDarkThemeJson,
    customCssOverride,
  ]);

  if (!validatedCss) {
    return null;
  }

  return <style id="custom-theme-active">{validatedCss}</style>;
}
