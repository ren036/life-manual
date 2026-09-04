import type { LifeRecord } from '../types';

export const ingredients = ['鸡蛋', '番茄', '青椒', '土豆', '鸡胸肉', '豆腐'];

export const seedRecords: LifeRecord[] = [
  { id: 'socket', kind: '维修', title: '客厅插座更换', detail: '先关闭总闸并拍下原接线。红色接 L，蓝色接 N，黄绿色接地线。', date: '今天', createdAt: 5, attachmentName: '接线照片 3 张' },
  { id: 'egg-tomato', kind: '菜品', title: '番茄炒蛋 · 第 4 次', detail: '这次少放糖，鸡蛋先炒至七成熟。', date: '昨天', createdAt: 4, ingredients: ['鸡蛋', '番茄'] },
  { id: 'invoice', kind: '文件', title: '冰箱电子发票', detail: '购买于 2025 年 6 月，保修至 2028 年 6 月。', date: '6 月 18 日', createdAt: 3, attachmentName: '冰箱发票.pdf' },
  { id: 'pepper-egg', kind: '菜品', title: '青椒炒蛋', detail: '青椒先干煸一分钟，约 12 分钟。', date: '5 月 12 日', createdAt: 2, ingredients: ['鸡蛋', '青椒'] },
  { id: 'potato-chicken', kind: '菜品', title: '土豆鸡丁', detail: '鸡肉用生抽和淀粉腌 10 分钟。', date: '4 月 27 日', createdAt: 1, ingredients: ['土豆', '鸡胸肉'] },
];
