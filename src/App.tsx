import { useState } from 'react';
import PosPage from '@/pages/PosPage';
import ManagerPage from '@/pages/ManagerPage';

type AppView = 'pos' | 'manager';

function App() {
  const [view, setView] = useState<AppView>('pos');

  if (view === 'manager') {
    return <ManagerPage onBackToPos={() => setView('pos')} />;
  }

  return <PosPage onOpenManager={() => setView('manager')} />;
}

export default App;
