import { ArrowRight, Camera, CheckSquare, FileUp, Utensils } from 'lucide-react';
import type { AddMode, AppTab, DocumentItem, Recipe, TaskItem } from '../types';

interface Props { recipes: Recipe[]; documents: DocumentItem[]; tasks: TaskItem[]; onNavigate: (tab: AppTab) => void; onAdd: (mode: AddMode) => void }

export function HomePage({ recipes, documents, tasks, onNavigate, onAdd }: Props) {
  const pending = tasks.filter((item) => !item.completed);
  return <section><div className="home-hero"><span>今天也慢慢来</span><h2>{pending.length ? `还有 ${pending.length} 件事等你处理` : '今天的事情都完成了'}</h2><button onClick={() => onNavigate('tasks')}>查看待办 <ArrowRight /></button></div><div className="quick-actions"><button onClick={() => onAdd('recipes')}><span><Utensils /></span><strong>记一道菜</strong><small>味道和照片</small></button><button onClick={() => onAdd('documents')}><span><FileUp /></span><strong>存份资料</strong><small>图片或文件</small></button><button onClick={() => onAdd('tasks')}><span><CheckSquare /></span><strong>加个待办</strong><small>别让事情溜走</small></button></div>
    <div className="section-heading"><h2>最近做过</h2><button onClick={() => onNavigate('recipes')}>全部菜谱</button></div><div className="mini-cards">{recipes.slice(0, 2).map((item) => <button key={item.id} onClick={() => onNavigate('recipes')}><span><Utensils /></span><strong>{item.title}</strong><small>{item.ingredients.join(' · ') || item.category}</small></button>)}{!recipes.length && <p className="empty-inline">还没有记录菜品</p>}</div>
    <div className="section-heading"><h2>最近资料</h2><button onClick={() => onNavigate('documents')}>打开资料库</button></div><div className="home-documents">{documents.slice(0, 2).map((item) => <button key={item.id} onClick={() => onNavigate('documents')}><span className="small-file-icon">{item.isImage ? <Camera /> : <FileUp />}</span><span><strong>{item.title}</strong><small>{item.category}</small></span></button>)}{!documents.length && <p className="empty-inline">还没有保存资料</p>}</div>
  </section>;
}
