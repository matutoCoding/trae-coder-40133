import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAppStore } from '@/store';

export default function Layout() {
  const initIfNeeded = useAppStore((s) => s.initIfNeeded);
  useEffect(() => {
    initIfNeeded();
  }, [initIfNeeded]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-h-full p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
