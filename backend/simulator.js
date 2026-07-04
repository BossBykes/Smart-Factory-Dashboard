const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3001';
const SEND_INTERVAL_MS = 1000;
const MACHINE_IDS = ['M001', 'M002', 'M003', 'M004', 'M005', 'M006'];

const FAULT_CHANCE_PER_TICK = 0;
const FAULT_CODES = ['OVERHEAT', 'VIBRATION_FAULT', 'MOTOR_FAULT'];

const INITIAL_STATUSES = {
  M001: 'running',
  M002: 'running',
  M003: 'idle',
  M004: 'running',
  M005: 'idle',
  M006: 'running',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randFloat = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(randFloat(min, max + 1));

const approach = (current, target, step, noise, min, max) => {
  const distance = target - current;
  const movement = Math.abs(distance) <= step ? distance : Math.sign(distance) * step;
  return clamp(current + movement + randFloat(-noise, noise), min, max);
};

const createMachine = (machineId, initialStatus) => {
  const isRunning = initialStatus === 'running';

  return {
    machineId,
    status: initialStatus,
    temperature: isRunning ? randFloat(60, 75) : randFloat(35, 45),
    vibration: isRunning ? randFloat(1.5, 3.0) : randFloat(0.1, 0.8),
    efficiency: isRunning ? randInt(82, 94) : 0,
    output: randInt(0, 200),
    powerConsumption: isRunning ? randFloat(5.0, 8.0) : randFloat(0.5, 1.5),
    manualStop: false,
    faultLatched: false,
    faultCode: null,
    emergencyStopActive: false,
    lastCommand: null,
    lastCommandAt: null,
    lastStateChangeAt: Date.now(),
    lastStateChangeReason: 'initial',
    productionRate: randInt(1, 4),
  };
};

const machines = MACHINE_IDS.map((machineId) =>
  createMachine(machineId, INITIAL_STATUSES[machineId] || 'idle')
);

const transitionMachine = (machine, nextStatus, reason) => {
  if (machine.status === nextStatus) {
    machine.lastStateChangeReason = reason;
    return;
  }

  const oldStatus = machine.status;
  machine.status = nextStatus;
  machine.lastStateChangeAt = Date.now();
  machine.lastStateChangeReason = reason;

  console.log(`Simulator state changed: ${machine.machineId} ${oldStatus} -> ${nextStatus} (${reason})`);
};

const rejectCommand = (machine, command) => {
  console.warn(`Simulator rejected command: ${command} for ${machine.machineId} while status=${machine.status}`);
};

const recordCommand = (machine, command) => {
  machine.lastCommand = command;
  machine.lastCommandAt = Date.now();
};

const createCommandAck = ({ commandId, machineId, command, accepted, applied, status, message }) => ({
  type: 'command_ack',
  commandId,
  machineId,
  command,
  accepted,
  applied,
  status,
  message,
  timestamp: new Date().toISOString(),
});

const triggerFault = (machine) => {
  const faultCode = FAULT_CODES[randInt(0, FAULT_CODES.length - 1)];

  machine.faultLatched = true;
  machine.faultCode = faultCode;
  machine.emergencyStopActive = false;

  console.log(`Simulator fault triggered: ${faultCode} for ${machine.machineId}`);
  transitionMachine(machine, 'error', faultCode);
};

const maybeTriggerFault = (machine) => {
  if (machine.status === 'running' && Math.random() < FAULT_CHANCE_PER_TICK) {
    triggerFault(machine);
  }
};

const updateTelemetry = (machine) => {
  maybeTriggerFault(machine);

  switch (machine.status) {
    case 'running':
      machine.output += machine.productionRate;
      machine.efficiency = Math.round(approach(machine.efficiency, randFloat(82, 94), 4, 1.2, 70, 98));
      machine.powerConsumption = approach(machine.powerConsumption, randFloat(5.0, 8.0), 0.8, 0.12, 0.2, 8.5);
      machine.temperature = approach(machine.temperature, randFloat(60, 80), 1.2, 0.35, 25, 95);
      machine.vibration = approach(machine.vibration, randFloat(1.5, 3.5), 0.35, 0.08, 0, 5.0);
      break;

    case 'idle':
      machine.efficiency = 0;
      machine.powerConsumption = 0;
      machine.temperature = 0;
      machine.vibration = 0;
      break;

    case 'maintenance':
      machine.efficiency = 0;
      machine.powerConsumption = 0;
      machine.temperature = 0;
      machine.vibration = 0;
      break;

    case 'error':
      machine.efficiency = 0;
      machine.powerConsumption = 0;
      machine.temperature = 0;
      machine.vibration = 0;
      break;

    default:
      machine.efficiency = 0;
      machine.powerConsumption = approach(machine.powerConsumption, 0.5, 0.5, 0.05, 0.1, 2.0);
      machine.temperature = approach(machine.temperature, 40, 0.8, 0.1, 25, 80);
      machine.vibration = approach(machine.vibration, 0.2, 0.2, 0.03, 0, 1.0);
      break;
  }

  return machine;
};

const applyCommand = (message) => {
  const commandId = message && message.commandId ? message.commandId : `CMD-${Date.now()}-${message?.machineId || 'unknown'}`;
  const machineId = message?.machineId;
  const command = message?.command;

  if (!message || typeof message !== 'object') {
    return createCommandAck({
      commandId,
      machineId,
      command,
      accepted: false,
      applied: false,
      status: 'rejected',
      message: 'Invalid command message',
    });
  }

  const machine = machines.find((item) => item.machineId === machineId);

  if (!machine) {
    return createCommandAck({
      commandId,
      machineId,
      command,
      accepted: false,
      applied: false,
      status: 'rejected',
      message: `Unknown machine: ${machineId}`,
    });
  }

  if (typeof command !== 'string') {
    return createCommandAck({
      commandId,
      machineId,
      command,
      accepted: false,
      applied: false,
      status: 'rejected',
      message: 'Invalid command',
    });
  }

  console.log(`Simulator command received: ${command} for ${machineId}`);
  recordCommand(machine, command);

  const rejectWithMessage = (responseMessage) => {
    rejectCommand(machine, command);
    return createCommandAck({
      commandId,
      machineId,
      command,
      accepted: false,
      applied: false,
      status: 'rejected',
      message: responseMessage,
    });
  };

  const acceptWithMessage = (responseMessage) => createCommandAck({
    commandId,
    machineId,
    command,
    accepted: true,
    applied: true,
    status: 'applied',
    message: responseMessage,
  });

  switch (command) {
    case 'start':
      if (machine.status !== 'idle') {
        return rejectWithMessage(`Cannot start machine while status is ${machine.status}`);
      }

      machine.manualStop = false;
      transitionMachine(machine, 'running', command);
      return acceptWithMessage('Start command applied');

    case 'stop':
      if (machine.status !== 'running') {
        return rejectWithMessage(`Cannot stop machine while status is ${machine.status}`);
      }

      machine.manualStop = true;
      transitionMachine(machine, 'idle', command);
      return acceptWithMessage('Stop command applied');

    case 'emergency_stop':
      if (!['running', 'idle', 'maintenance'].includes(machine.status)) {
        return rejectWithMessage(`Cannot emergency stop machine while status is ${machine.status}`);
      }

      machine.faultLatched = true;
      machine.faultCode = 'EMERGENCY_STOP';
      machine.emergencyStopActive = true;
      transitionMachine(machine, 'error', command);
      return acceptWithMessage('Emergency stop command applied');

    case 'reset_emergency':
      if (machine.status !== 'error') {
        return rejectWithMessage(`Cannot reset emergency while status is ${machine.status}`);
      }

      machine.faultLatched = false;
      machine.faultCode = null;
      machine.emergencyStopActive = false;
      transitionMachine(machine, 'idle', command);
      return acceptWithMessage('Reset emergency command applied');

    case 'maintenance_mode':
      if (machine.status !== 'idle') {
        return rejectWithMessage(`Cannot enter maintenance mode while status is ${machine.status}`);
      }

      transitionMachine(machine, 'maintenance', command);
      return acceptWithMessage('Maintenance mode command applied');

    case 'exit_maintenance':
      if (machine.status !== 'maintenance') {
        return rejectWithMessage(`Cannot exit maintenance mode while status is ${machine.status}`);
      }

      transitionMachine(machine, 'idle', command);
      return acceptWithMessage('Exit maintenance command applied');

    default:
      return rejectWithMessage(`Unknown command: ${command}`);
  }
};

const ws = new WebSocket(WS_URL);

let telemetryInterval = null;

ws.on('open', () => {
  console.log(`Simulator connected to ${WS_URL}`);

  telemetryInterval = setInterval(() => {
    machines.forEach((machine) => {
      const updated = updateTelemetry(machine);
      const payload = {
        type: 'machine_data',
        machineId: updated.machineId,
        status: updated.status,
        temperature: Number(updated.temperature.toFixed(1)),
        vibration: Number(updated.vibration.toFixed(2)),
        powerConsumption: Number(updated.powerConsumption.toFixed(2)),
        efficiency: Math.round(updated.efficiency),
        output: updated.output,
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(payload));
    });
  }, SEND_INTERVAL_MS);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    const ack = applyCommand(message);
    ws.send(JSON.stringify(ack));
  } catch (error) {
    console.error('Simulator failed to parse command:', error);
  }
});

ws.on('close', () => {
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
  }

  console.log('Simulator disconnected');
});

ws.on('error', (error) => {
  console.error('Simulator WebSocket error:', error);
});
