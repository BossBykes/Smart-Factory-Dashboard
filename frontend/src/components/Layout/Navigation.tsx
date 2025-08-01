import React from 'react';
import { 
  HomeIcon, 
  CogIcon, 
  ChartBarIcon, 
  BellIcon, 
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon 
} from '@heroicons/react/24/outline';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'overview', name: 'Factory Overview', icon: HomeIcon },
    { id: 'machines', name: 'Machines', icon: CogIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'alerts', name: 'Alerts', icon: BellIcon },
    { id: 'production', name: 'Production', icon: ClipboardDocumentListIcon },
    { id: 'maintenance', name: 'Maintenance', icon: WrenchScrewdriverIcon },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white">Smart Factory</h1>
            </div>
          </div>
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};