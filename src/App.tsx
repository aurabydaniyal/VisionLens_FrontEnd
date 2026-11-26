import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav, { NavTab } from './components/BottomNav';
import GreenLoader from './components/GreenLoader';
import UpgradeModal from './components/UpgradeModal';
import AuthPage from './pages/AuthPage';
import HomeCameraPage from './pages/HomeCameraPage';
import LensyChatPage from './pages/LensyChatPage';
import SettingsPage from './pages/SettingsPage';

const AppShell: React.FC = () => {
  const { user, loading, isAuthenticated, openUpgradeModal } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [pendingLensySessionId, setPendingLensySessionId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#04070a]">
        <GreenLoader scale={0.65} label="Loading Vision Lens..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthPage />;
  }

  const handleNavSelect = (tab: NavTab) => {
    if (tab === 'lensy' && user.plan_tier === 'lite') {
      openUpgradeModal(
        'Lensy AI multimodal chat & document RAG are exclusive to VisionLens Plus.',
        false
      );
      return;
    }
    setActiveTab(tab);
  };

  const handleOpenLensySession = (sessionId: string) => {
    setPendingLensySessionId(sessionId);
    setActiveTab('lensy');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#04070a]">
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="tab-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="h-full w-full"
          >
            <HomeCameraPage onOpenLensySession={handleOpenLensySession} />
          </motion.div>
        )}

        {activeTab === 'lensy' && (
          <motion.div
            key="tab-lensy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="h-full w-full"
          >
            <LensyChatPage
              initialSessionId={pendingLensySessionId}
              onConsumeInitialSession={() => setPendingLensySessionId(null)}
            />
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="tab-settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="h-full w-full"
          >
            <SettingsPage />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav activeTab={activeTab} planTier={user.plan_tier} onSelect={handleNavSelect} />
      <UpgradeModal onGoToSettings={() => setActiveTab('settings')} />
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppShell />
  </AuthProvider>
);

export default App;
