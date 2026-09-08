import type { AddMode } from './types';

export const CATEGORY_PRESETS: Record<AddMode, string[]> = {
  recipes: ['家常菜', '早餐', '主食', '汤羹', '烘焙', '甜点', '饮品'],
  documents: ['证件资料', '医疗健康', '发票与保修', '家庭与房屋', '车辆', '教育', '其他'],
  tasks: ['生活', '家庭', '采购', '健康', '工作', '学习'],
};

export function categoryOptions(mode: AddMode, current?: string): string[] {
  return [...new Set([...(current ? [current] : []), ...CATEGORY_PRESETS[mode]])];
}

export function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[，,、\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].slice(0, 12);
}
