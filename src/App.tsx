import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav, { NavTab } from './components/BottomNav';
import GreenLoader from './components/GreenLoader';
import UpgradeModal from './components/UpgradeModal';
import AuthPage from './pages/AuthPage';
import HomeCameraPage from './pages/HomeCameraPage';
import LensyChatPage, { LensyImageHandoff } from './pages/LensyChatPage';
import SettingsPage from './pages/SettingsPage';

const AppShell: React.FC = () => {
  const { user, loading, isAuthenticated, openUpgradeModal } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [pendingLensySessionId, setPendingLensySessionId] = useState<string | null>(null);
  const [pendingImageHandoff, setPendingImageHandoff] = useState<LensyImageHandoff | null>(null);

  const handleNavSelect = useCallback(
    (tab: NavTab) => {
      if (tab === 'lensy' && user?.plan_tier === 'lite') {
        openUpgradeModal(
          'Lensy AI chat, photo analysis, and document reading are available on VisionLens Plus.',
          false
        );
        return;
      }
      setActiveTab(tab);
    },
    [openUpgradeModal, user?.plan_tier]
  );

  const handleOpenLensySession = useCallback((sessionId: string) => {
    setPendingImageHandoff(null);
    setPendingLensySessionId(sessionId);
    setActiveTab('lensy');
  }, []);

  const handleAskLensyWithImage = useCallback(
    (blob: Blob, prompt: string) => {
      if (!user || user.plan_tier === 'lite') {
        openUpgradeModal(
          'Ask Lensy photo identification is available on VisionLens Plus.',
          false
        );
        return;
      }
      setPendingLensySessionId(null);
      setPendingImageHandoff({
        blob,
        previewUrl: URL.createObjectURL(blob),
        prompt,
      });
      setActiveTab('lensy');
    },
    [openUpgradeModal, user]
  );

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center overflow-hidden bg-[#04070a]">
        <GreenLoader scale={0.62} label="Loading Vision Lens..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthPage />;
  }

  return (
    <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#04070a]">
      {/* Main Viewport Area — guaranteed NEVER to slide underneath BottomNav */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full w-full overflow-hidden"
            >
              <HomeCameraPage
                onOpenLensySession={handleOpenLensySession}
                onAskLensyWithImage={handleAskLensyWithImage}
              />
            </motion.div>
          )}

          {activeTab === 'lensy' && (
            <motion.div
              key="tab-lensy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full w-full overflow-hidden"
            >
              <LensyChatPage
                initialSessionId={pendingLensySessionId}
                onConsumeInitialSession={() => setPendingLensySessionId(null)}
                initialImageHandoff={pendingImageHandoff}
                onConsumeImageHandoff={() => setPendingImageHandoff(null)}
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
              className="h-full w-full overflow-hidden"
            >
              <SettingsPage />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dedicated Non-Overlapping Bottom Navigation Dock with Edge Blur */}
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
