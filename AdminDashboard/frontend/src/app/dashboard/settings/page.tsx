import { Header } from '@/components/layout/Header';
import { AIEngineSection } from './components/AIEngineSection';
import { NotificationsSection } from './components/NotificationsSection';
import { ProfileSection } from './components/ProfileSection';
import { SettingsSidebar } from './components/SettingsSidebar';

export default function SettingsPage() {
  return (
    <>
      <Header
        title="Platform Settings"
        subtitle="Manage your workspace and profile configurations"
      />

      <div className="p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <SettingsSidebar />

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <ProfileSection />
            <NotificationsSection />
            <AIEngineSection />
          </div>
        </div>
      </div>
    </>
  );
}
