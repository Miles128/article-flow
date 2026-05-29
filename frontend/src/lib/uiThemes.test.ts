import { describe, expect, it } from 'vitest';
import {
  normalizeUiTheme,
  stepNumeral,
  UI_THEME_COLOR_SCHEME,
  UI_THEME_IDS,
  uiThemeColorScheme,
} from './uiThemes';

describe('uiThemes', () => {
  it('stepNumeral uses chinese numerals for 1-10', () => {
    expect(stepNumeral(1)).toBe('壹');
    expect(stepNumeral(5)).toBe('伍');
    expect(stepNumeral(10)).toBe('拾');
    expect(stepNumeral(11)).toBe('11');
  });

  it('normalizeUiTheme falls back to shuyuan', () => {
    expect(normalizeUiTheme('shuyuan')).toBe('shuyuan');
    expect(normalizeUiTheme('cyber')).toBe('cyber');
    expect(normalizeUiTheme('invalid')).toBe('shuyuan');
  });

  it('maps legacy plain to minimal', () => {
    expect(normalizeUiTheme('plain')).toBe('minimal');
  });

  it('exports seven theme ids including shuimo', () => {
    expect(UI_THEME_IDS).toHaveLength(7);
    expect(UI_THEME_IDS).toContain('shuimo');
    expect(UI_THEME_IDS).toContain('material');
    expect(UI_THEME_IDS).toContain('cyber');
  });

  it('maps dark themes for shell and editor coherence', () => {
    expect(uiThemeColorScheme('cyber')).toBe('dark');
    expect(uiThemeColorScheme('slate')).toBe('dark');
    expect(uiThemeColorScheme('minimal')).toBe('light');
    expect(UI_THEME_COLOR_SCHEME.shuyuan).toBe('light');
  });
});
