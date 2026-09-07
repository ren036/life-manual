import type { DocumentItem, Recipe, TaskItem } from '../types';

export const seedRecipes: Recipe[] = [
  {
    id: 'egg-tomato',
    title: '番茄炒蛋',
    notes: '这次少放糖，鸡蛋先炒至七成熟。',
    ingredients: ['鸡蛋', '番茄'],
    category: '家常菜',
    date: '昨天',
    createdAt: 4,
  },
  {
    id: 'pepper-egg',
    title: '青椒炒蛋',
    notes: '青椒先干煸一分钟，约 12 分钟。',
    ingredients: ['鸡蛋', '青椒'],
    category: '快手菜',
    date: '5 月 12 日',
    createdAt: 2,
  },
  {
    id: 'potato-chicken',
    title: '土豆鸡丁',
    notes: '鸡肉用生抽和淀粉腌 10 分钟。',
    ingredients: ['土豆', '鸡胸肉'],
    category: '家常菜',
    date: '4 月 27 日',
    createdAt: 1,
  },
];

export const seedDocuments: DocumentItem[] = [
  {
    id: 'socket',
    title: '客厅插座更换',
    description: '先关闭总闸并拍下原接线。红色接 L，蓝色接 N，黄绿色接地线。',
    category: '家庭与房屋',
    important: false,
    date: '今天',
    createdAt: 5,
  },
  {
    id: 'invoice',
    title: '冰箱电子发票',
    description: '购买于 2025 年 6 月，保修至 2028 年 6 月。',
    category: '发票与保修',
    important: true,
    date: '6 月 18 日',
    createdAt: 3,
  },
];

export const seedTasks: TaskItem[] = [
  {
    id: 'task-backup',
    title: '备份重要资料',
    notes: '整理证件和发票的电子版',
    category: '家庭',
    priority: '重要',
    completed: false,
    createdAt: 7,
  },
  {
    id: 'task-shopping',
    title: '补充鸡蛋和番茄',
    notes: '',
    category: '采购',
    priority: '普通',
    completed: false,
    createdAt: 6,
  },
];
