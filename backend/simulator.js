const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3001';
const SEND_INTERVAL_MS = 1000;
const MACHINE_IDS = ['M001', 'M002', 'M003', 'M004', 'M005', 'M006'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randFloat = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(randFloat(min, max + 1));

const statusWeights = {
  running: 0.75,
  idle: 0.23,
  error: 0.02,
};

const pickStatus = () => {
  const r = Math.random();
  if (r < statusWeights.error) return 'error';
  if (r < statusWeights.error + statusWeights.idle) return 'idle';
  return 'running';
};

const machines = MACHINE_IDS.map((id) => ({
  machineId: id,
  status: 'idle',
  temperature: randFloat(45, 70),
  vibration: randFloat(0.8, 3.0),
  efficiency: randInt(60, 92),
  output: randInt(0, 200),
  powerConsumption: randFloat(1.5, 6.0),
}));

const updateMachine = (machine) => {
  // Decide status (error rarely)
  machine.status = pickStatus();

  const isError = machine.status === 'error';
  const isRunning = machine.status === 'running';

  machine.temperature = clamp(
    machine.temperature + randFloat(-1.5, 1.5) + (isError ? randFloat(8, 15) : 0),
    40,
    85
  );

  machine.vibration = clamp(
    machine.vibration + randFloat(-0.4, 0.4) + (isError ? randFloat(1.0, 2.0) : 0),
    0.5,
    5.0
  );

  machine.efficiency = clamp(
    machine.efficiency + randInt(-4, 4) + (isError ? -randInt(10, 25) : 0),
    50,
    98
  );

  machine.powerConsumption = clamp(
    machine.powerConsumption + randFloat(-0.6, 0.6) + (isRunning ? randFloat(0.2, 0.8) : -randFloat(0.2, 0.6)),
    1.0,
    8.0
  );

  if (isRunning) {
    machine.output += randInt(1, 4);
  }

  return machine;
};

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log(` Simulator connected to ${WS_URL}`);
  setInterval(() => {
    machines.forEach((machine) => {
      const updated = updateMachine(machine);
      const payload = {
        type: 'machine_data',
        machineId: updated.machineId,
        status: updated.status,
        temperature: Number(updated.temperature.toFixed(1)),
        vibration: Number(updated.vibration.toFixed(1)),
        powerConsumption: Number(updated.powerConsumption.toFixed(1)),
        efficiency: Math.round(updated.efficiency),
        output: updated.output,
        timestamp: Date.now(),
      };
      ws.send(JSON.stringify(payload));
    });
  }, SEND_INTERVAL_MS);
});

ws.on('close', () => {
  console.log(' Simulator disconnected');
});

ws.on('error', (err) => {
  console.error(' Simulator WebSocket error:', err);
});
