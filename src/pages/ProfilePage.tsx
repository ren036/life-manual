import { Switch } from '@mantine/core';
import { BookOpen, Moon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { SettingsSheet } from '../components/SettingsSheet';
import { PageHeading } from '../components/PageHeading';
interface Props {
  recordCount: number;
  pendingCount: number;
  dark: boolean;
  onToggleTheme: () => void;
  settings: Omit<ComponentProps<typeof SettingsSheet>, 'open' | 'onClose' | 'embedded'>;
}
export function ProfilePage({ recordCount, pendingCount, dark, onToggleTheme, settings }: Props) {
  return (
    <div className="profile-page">
      <PageHeading title="我的" description="偏好设置与数据管理" />
      <div className="personal-mark">
        <BookOpen size={30} strokeWidth={1.4} />
        <div>
          <strong>我的生活手册</strong>
          <span>
            {recordCount} 条记录 · {pendingCount} 件待办
          </span>
        </div>
      </div>
      <div className="privacy-note">
        记录只保存在当前设备。换设备或清理浏览器前，记得导出一份备份。
      </div>
      <div className="profile-preferences">
        <Moon size={19} />
        <div>
          <strong>深色外观</strong>
          <span>按自己的习惯选择</span>
        </div>
        <Switch checked={dark} onChange={onToggleTheme} aria-label="深色外观" />
      </div>
      <h2 className="profile-section-title">手册与数据</h2>
      <SettingsSheet {...settings} open embedded onClose={() => {}} />
    </div>
  );
}
