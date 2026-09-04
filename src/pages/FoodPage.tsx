import { useMemo, useState } from 'react';
import { ingredients } from '../data/seed';
import type { LifeRecord } from '../types';

export function FoodPage({ records }: { records: LifeRecord[] }) {
  const [selected, setSelected] = useState(['鸡蛋', '番茄']);
  const matches = useMemo(() => records.filter((record) => record.kind === '菜品' && record.ingredients).map((record) => ({ record, missing: record.ingredients!.filter((item) => !selected.includes(item)) })).filter(({ missing }) => missing.length <= 1).sort((a, b) => a.missing.length - b.missing.length), [records, selected]);
  return <section><p className="page-intro">只从你亲手做过的菜里推荐。</p><h2>我现在有</h2><div className="chips">{ingredients.map((item) => <button key={item} aria-pressed={selected.includes(item)} onClick={() => setSelected((old) => old.includes(item) ? old.filter((value) => value !== item) : [...old, item])}>{item}</button>)}</div><div className="section-heading"><h2>可以做</h2><span>{matches.length} 道</span></div><div className="record-list">{matches.map(({ record, missing }) => <article className="recipe-card" key={record.id}><div><h3>{record.title.replace(/ ·.*/, '')}</h3><p>{record.detail}</p></div><strong className={missing.length ? 'missing' : ''}>{missing.length ? `缺 ${missing[0]}` : '可以直接做'}</strong></article>)}</div></section>;
}
