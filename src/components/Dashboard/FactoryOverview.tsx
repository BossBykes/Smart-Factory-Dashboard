// src/components/Dashboard/FactoryOverview.tsx

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Paper
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Warning,
  CheckCircle,
  Error,
  Build
} from '@mui/icons-material';
import { MachineStatus, SensorData } from '../../types/machine.types';
import { mockMachines, generateSensorData, createRealtimeDataStream } from '../../utils/mockData';

interface MachineCardProps {
  machine: MachineStatus;
  sensorData?: SensorData;
  onMachineControl: (machineId: string, command: string) => void;
}

const MachineCard: React.FC<MachineCardProps> = ({ machine, sensorData, onMachineControl }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'idle': return 'warning';
      case 'error': return 'error';
      case 'maintenance': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle color="success" />;
      case 'idle': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'maintenance': return <Build color="info" />;
      default: return null;
    }
  };

  return (
    <Card 
      elevation={3} 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {machine.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {machine.location}
            </Typography>
          </Box>
          {getStatusIcon(machine.status)}
        </Box>

        <Chip
          label={machine.status.toUpperCase()}
          color={getStatusColor(machine.status) as any}
          size="small"
          sx={{ mb: 2 }}
        />

        {sensorData && (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Temperature:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {sensorData.temperature.toFixed(1)}°C
              </Typography>
            </Box>
            
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Power:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {sensorData.powerConsumption.toFixed(2)} kW
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Production:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {sensorData.productionCount} units
              </Typography>
            </Box>

            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2">Health Score:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {sensorData.healthScore.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={sensorData.healthScore} 
                color={sensorData.healthScore > 80 ? 'success' : 'warning'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            <Box display="flex" justifyContent="space-between" mt={2}>
              <IconButton
                size="small"
                onClick={() => onMachineControl(machine.id, 'start')}
                disabled={machine.status === 'running'}
                color="success"
              >
                <PlayArrow />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onMachineControl(machine.id, 'stop')}
                disabled={machine.status === 'idle'}
                color="error"
              >
                <Stop />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onMachineControl(machine.id, 'maintenance')}
                color="info"
              >
                <Build />
              </IconButton>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const FactoryOverview: React.FC = () => {
  const [machines, setMachines] = useState<MachineStatus[]>(mockMachines);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Initial sensor data
    const initialData = machines.map(machine => generateSensorData(machine.id));
    setSensorData(initialData);

    // Setup real-time updates
    const cleanup = createRealtimeDataStream((newData) => {
      setSensorData(newData);
      setLastUpdate(new Date());
    });

    return cleanup;
  }, [machines]);

  const handleMachineControl = (machineId: string, command: string) => {
    setMachines(prev => prev.map(machine => {
      if (machine.id === machineId) {
        let newStatus: any = machine.status;
        switch (command) {
          case 'start':
            newStatus = 'running';
            break;
          case 'stop':
            newStatus = 'idle';
            break;
          case 'maintenance':
            newStatus = 'maintenance';
            break;
        }
        return { ...machine, status: newStatus, lastUpdate: new Date() };
      }
      return machine;
    }));
  };

  const getSummaryStats = () => {
    const running = machines.filter(m => m.status === 'running').length;
    const total = machines.length;
    const avgHealth = sensorData.length > 0 
      ? sensorData.reduce((sum, data) => sum + data.healthScore, 0) / sensorData.length
      : 0;
    const totalProduction = sensorData.reduce((sum, data) => sum + data.productionCount, 0);

    return { running, total, avgHealth, totalProduction };
  };

  const stats = getSummaryStats();

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight="bold">
              {stats.running}/{stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Machines Running
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" fontWeight="bold">
              {stats.avgHealth.toFixed(0)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average Health
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              {stats.totalProduction}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Production
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Last Update
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {lastUpdate.toLocaleTimeString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Machine Cards */}
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Machine Status
      </Typography>
      
      <Grid container spacing={3}>
        {machines.map((machine) => {
          const machineData = sensorData.find(data => data.machineId === machine.id);
          return (
            <Grid item xs={12} md={6} lg={4} key={machine.id}>
              <MachineCard
                machine={machine}
                sensorData={machineData}
                onMachineControl={handleMachineControl}
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default FactoryOverview;