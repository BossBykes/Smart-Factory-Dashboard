import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Layout/Navigation';
import { FactoryOverview } from './components/Dashboard/FactoryOverview';
import { MachineDetail } from './components/Machine/MachineDetail';
import { ProductionMetrics } from './components/Dashboard/ProductionMetrics';
import { AlertPanel } from './components/Alerts/AlertPanel';
import { ProductionSchedule } from './components/Dashboard/ProductionSchedule';
import { MaintenanceSchedule } from './components/Dashboard/MaintenanceSchedule';
import { factoryService } from './services/factoryService';

function App() {
  const [currentView, setCurrentView] = useState<string>('overview');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(0);

  useEffect(() => {
    const updateAlertCount = () => {
      const alerts = factoryService.getUnacknowledgedAlerts();
      setUnacknowledgedAlerts(alerts.length);
    };

    updateAlertCount();
    const interval = setInterval(updateAlertCount, 3000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup service on unmount
  useEffect(() => {
    return () => {
      factoryService.cleanup();
    };
  }, []);

  const handleMachineSelect = (machineId: string) => {
    setSelectedMachineId(machineId);
    setCurrentView('machine-detail');
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    setSelectedMachineId(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return <FactoryOverview onMachineSelect={handleMachineSelect} />;
      case 'machine-detail':
        return selectedMachineId ? (
          <MachineDetail 
            machineId={selectedMachineId} 
            onBack={() => setCurrentView('overview')} 
          />
        ) : (
          <FactoryOverview onMachineSelect={handleMachineSelect} />
        );
      case 'machines':
        return <FactoryOverview onMachineSelect={handleMachineSelect} />;
      case 'analytics':
        return <ProductionMetrics />;
      case 'alerts':
        return <AlertPanel />;
      case 'production':
        return <ProductionSchedule />;
      case 'maintenance':
        return <MaintenanceSchedule />;
      default:
        return <FactoryOverview onMachineSelect={handleMachineSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation currentView={currentView} onViewChange={handleViewChange} />
      
      {/* Alert Indicator */}
      {unacknowledgedAlerts > 0 && currentView !== 'alerts' && (
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={() => setCurrentView('alerts')}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg shadow-lg transition-colors animate-pulse"
          >
            {unacknowledgedAlerts} Alert{unacknowledgedAlerts > 1 ? 's' : ''}
          </button>
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;