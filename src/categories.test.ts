import { describe, expect, it } from 'vitest';
import { categoryOptions, parseTags } from './categories';

describe('分类与标签', () => {
  it('保留已有自定义分类且不重复', () => {
    expect(categoryOptions('recipes', '私房菜')[0]).toBe('私房菜');
    expect(categoryOptions('recipes', '家常菜').filter((item) => item === '家常菜')).toHaveLength(
      1,
    );
  });

  it('批量标签去重并兼容常见分隔符', () => {
    expect(parseTags('常用，家庭 常用')).toEqual(['常用', '家庭']);
  });
});
