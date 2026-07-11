import { describe, expect, it } from 'vitest';
import { normalizeFontId, fontStack } from './uiFonts';

describe('uiFonts', () => {
  it('normalizeFontId accepts song kai hei', () => {
    expect(normalizeFontId('song', 'kai')).toBe('song');
    expect(normalizeFontId('hei', 'kai')).toBe('hei');
    expect(normalizeFontId('bad', 'kai')).toBe('kai');
  });

  it('fontStack prefers PingFang and Microsoft YaHei for hei', () => {
    expect(fontStack('hei')).toContain('PingFang SC');
    expect(fontStack('hei')).toContain('Microsoft YaHei');
  });
});
