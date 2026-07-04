import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  StopIcon, 
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  WifiIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';
import { factoryService, type CommandAck } from '../../services/factoryService';
import { Machine } from '../../types/factory';
import { cn } from '../../utils/helpers';

interface PendingCommand {
  commandId: string;
  command: string;
  name: string;
}

interface MachineControlPanelProps {
  machine: Machine;
  onUpdate?: (machine: Machine) => void;
}

export const MachineControlPanel: React.FC<MachineControlPanelProps> = ({ 
  machine, 
  onUpdate 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [pendingCommand, setPendingCommand] = useState<PendingCommand | null>(null);
  const pendingCommandRef = useRef<PendingCommand | null>(null);
  const [commandHistory, setCommandHistory] = useState<Array<{command: string, timestamp: Date, success: boolean}>>([]);
  const [commandStatus, setCommandStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    // Listen for connection status updates
    const handleConnectionUpdate = (data: { status: 'connected' | 'disconnected' | 'error' }) => {
      setConnectionStatus(data.status);
    };

    const handleMachineUpdate = (updatedMachine: Machine) => {
      if (updatedMachine.id === machine.id) {
        onUpdate?.(updatedMachine);
      }
    };

    const handleCommandAck = (ack: CommandAck) => {
      if (ack.machineId !== machine.id) return;

      const pending = pendingCommandRef.current;
      if (!pending || pending.commandId !== ack.commandId) return;

      setIsLoading(false);
      addToCommandHistory(pending.name, ack.applied);
      setCommandStatus({
        type: ack.applied ? 'success' : 'error',
        message: ack.message || (ack.applied ? `${pending.name} applied` : `${pending.name} failed`)
      });
      pendingCommandRef.current = null;
      setPendingCommand(null);
    };

    factoryService.addEventListener('connection', handleConnectionUpdate);
    factoryService.addEventListener('command_ack', handleCommandAck);
    factoryService.addEventListener('machine_update', handleMachineUpdate);

    // Check initial connection status
    setConnectionStatus(factoryService.getConnectionStatus());

    return () => {
      factoryService.removeEventListener('connection', handleConnectionUpdate);
      factoryService.removeEventListener('command_ack', handleCommandAck);
      factoryService.removeEventListener('machine_update', handleMachineUpdate);
    };
  }, [machine.id, onUpdate]);

  const addToCommandHistory = (command: string, success: boolean) => {
    setCommandHistory(prev => [
      {command, timestamp: new Date(), success},
      ...prev.slice(0, 4) // Keep last 5 commands
    ]);
  };

  const clearPendingCommand = () => {
    pendingCommandRef.current = null;
    setPendingCommand(null);
  };

  const executeCommand = async (
    commandFunction: (commandId: string) => Promise<boolean>,
    commandName: string,
    command: string
  ) => {
    if (isLoading) return;

    const commandId = `CMD-${Date.now()}-${machine.id}-${command}`;
    const nextPendingCommand = { commandId, command, name: commandName };
    
    setIsLoading(true);
    setPendingCommand(nextPendingCommand);
    pendingCommandRef.current = nextPendingCommand;
    setCommandStatus({ type: 'info', message: `${commandName} sent. Waiting for acknowledgement.` });
    
    try {
      const sent = await commandFunction(commandId);
      if (!sent) {
        addToCommandHistory(commandName, false);
        setIsLoading(false);
        clearPendingCommand();
        setCommandStatus({ type: 'error', message: 'Command could not be sent. Machine is offline or disconnected.' });
      }
    } catch (error) {
      console.error('Command execution error:', error);
      addToCommandHistory(commandName, false);
      setIsLoading(false);
      clearPendingCommand();
      setCommandStatus({ type: 'error', message: 'Command could not be sent. Check the machine connection.' });
    }
  };

  const handleStart = () => {
    executeCommand(
      (commandId) => factoryService.startMachine(machine.id, commandId),
      'START',
      'start'
    );
  };

  const handleStop = () => {
    executeCommand(
      (commandId) => factoryService.stopMachine(machine.id, commandId),
      'STOP',
      'stop'
    );
  };

  const handleEmergencyStop = () => {
    if (window.confirm('Are you sure you want to trigger an emergency stop? This will immediately halt all machine operations.')) {
      executeCommand(
        (commandId) => factoryService.emergencyStop(machine.id, commandId),
        'EMERGENCY STOP',
        'emergency_stop'
      );
    }
  };

  const handleResetEmergency = () => {
    executeCommand(
      (commandId) => factoryService.resetEmergency(machine.id, commandId),
      'RESET EMERGENCY',
      'reset_emergency'
    );
  };

  const handleMaintenanceMode = () => {
    if (window.confirm('Set machine to maintenance mode? This will stop production and mark the machine as under maintenance.')) {
      executeCommand(
        (commandId) => factoryService.setMaintenanceMode(machine.id, commandId),
        'MAINTENANCE MODE',
        'maintenance_mode'
      );
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <WifiIcon className="h-4 w-4 text-green-400" />;
      case 'disconnected':
        return <SignalSlashIcon className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <SignalIcon className="h-4 w-4 text-red-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live Control';
      case 'disconnected':
        return 'Connecting...';
      case 'error':
        return 'Offline Mode';
    }
  };

  const canControl = connectionStatus === 'connected' && !isLoading;
  const isEmergencyState = machine.status === 'error';
  const isMaintenanceState = machine.status === 'maintenance';

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Machine Control</h3>
        <div className="flex items-center space-x-2 text-sm">
          {getConnectionIcon()}
          <span className={cn(
            "font-medium",
            connectionStatus === 'connected' ? 'text-green-400' :
            connectionStatus === 'disconnected' ? 'text-yellow-400' : 'text-red-400'
          )}>
            {getConnectionText()}
          </span>
        </div>
      </div>

      {/* Emergency Status Banner */}
      {isEmergencyState && (
        <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <span className="text-red-400 font-medium">EMERGENCY STOP ACTIVE</span>
          </div>
          <p className="text-red-300 text-sm mt-1">Machine is in emergency stop state. Reset required before operation.</p>
        </div>
      )}

      {/* Maintenance Status Banner */}
      {isMaintenanceState && (
        <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <WrenchScrewdriverIcon className="h-5 w-5 text-blue-400" />
            <span className="text-blue-400 font-medium">MAINTENANCE MODE</span>
          </div>
          <p className="text-blue-300 text-sm mt-1">Machine is under maintenance. Production is temporarily halted.</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!canControl || isEmergencyState || machine.status === 'running'}
          className={cn(
            "flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200",
            canControl && !isEmergencyState && machine.status !== 'running'
              ? "bg-green-600 hover:bg-green-700 text-white hover:scale-105 shadow-lg"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading && pendingCommand?.name === 'START' ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <PlayIcon className="h-5 w-5" />
          )}
          <span>START</span>
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStop}
          disabled={!canControl || machine.status === 'idle'}
          className={cn(
            "flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200",
            canControl && machine.status !== 'idle'
              ? "bg-yellow-600 hover:bg-yellow-700 text-white hover:scale-105 shadow-lg"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading && pendingCommand?.name === 'STOP' ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <StopIcon className="h-5 w-5" />
          )}
          <span>STOP</span>
        </button>

        {/* Emergency Stop Button */}
        <button
          onClick={handleEmergencyStop}
          disabled={!canControl || isEmergencyState}
          className={cn(
            "flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200",
            canControl && !isEmergencyState
              ? "bg-red-600 hover:bg-red-700 text-white hover:scale-105 shadow-lg animate-pulse"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading && pendingCommand?.name === 'EMERGENCY STOP' ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5" />
          )}
          <span>E-STOP</span>
        </button>

        {/* Reset Emergency Button */}
        <button
          onClick={handleResetEmergency}
          disabled={!canControl || !isEmergencyState}
          className={cn(
            "flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200",
            canControl && isEmergencyState
              ? "bg-orange-600 hover:bg-orange-700 text-white hover:scale-105 shadow-lg"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          )}
        >
          {isLoading && pendingCommand?.name === 'RESET EMERGENCY' ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowPathIcon className="h-5 w-5" />
          )}
          <span>RESET</span>
        </button>
      </div>

      {/* Maintenance Mode Button */}
      <button
        onClick={handleMaintenanceMode}
        disabled={!canControl || isMaintenanceState}
        className={cn(
          "w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 mb-4",
          canControl && !isMaintenanceState
            ? "bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 shadow-lg"
            : "bg-gray-600 text-gray-400 cursor-not-allowed"
        )}
      >
        {isLoading && pendingCommand?.name === 'MAINTENANCE MODE' ? (
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
        ) : (
          <WrenchScrewdriverIcon className="h-5 w-5" />
        )}
        <span>MAINTENANCE MODE</span>
      </button>

      {commandStatus && (
        <div className={cn(
          "mb-4 rounded-lg border p-3 text-sm",
          commandStatus.type === 'success' && "bg-green-600/20 border-green-600/30 text-green-300",
          commandStatus.type === 'error' && "bg-red-600/20 border-red-600/30 text-red-300",
          commandStatus.type === 'info' && "bg-gray-700/50 border-gray-600 text-gray-300"
        )}>
          {commandStatus.message}
        </div>
      )}

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Commands</h4>
          <div className="space-y-1">
            {commandHistory.map((cmd, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between text-xs py-1 px-2 rounded",
                  cmd.success ? "bg-green-600/20 text-green-300" : "bg-red-600/20 text-red-300"
                )}
              >
                <span>{cmd.command}</span>
                <span>{cmd.timestamp.toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status Details */}
      {connectionStatus !== 'connected' && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-400">
            {connectionStatus === 'disconnected' && 'Attempting to connect to machine...'}
            {connectionStatus === 'error' && 'Machine offline. Controls disabled. Check Arduino connection.'}
          </p>
        </div>
      )}
    </div>
  );
};
