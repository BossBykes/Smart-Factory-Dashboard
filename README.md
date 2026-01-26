# Smart Factory Dashboard

A real-time IoT dashboard for monitoring and controlling factory machines using Arduino sensors and React.

## 🏗️ Architecture

```
🏭 Arduino Sensors → 📡 WiFi → 🖥️ Node.js Server → 📱 React Dashboard
```

## 🚀 Quick Start

1. **Hardware Setup**: Connect your Arduino components according to the wiring diagram
2. **WiFi Configuration**: Update `arduino/config.h` with your WiFi credentials
3. **Start Services**: Run `./scripts/start-all.sh`
4. **Upload Arduino Code**: Flash the Arduino code to your device
5. **Open Dashboard**: Visit http://localhost:3000

## 📁 Project Structure

```
smart-factory-dashboard/
├── frontend/          # React TypeScript dashboard
├── backend/           # Node.js WebSocket server
├── arduino/           # Arduino C++ code
├── scripts/           # Startup scripts
└── docs/             # Documentation
```

## 🔧 Hardware Requirements

- Arduino Uno R3
- ESP8266 WiFi Module
- DS18B20 Temperature Sensor
- SW-420 Vibration Sensor
- ACS712 Current Sensor (30A)
- WS2812B RGB LED Strip
- NEMA 17 Stepper Motor + Driver
- 16x2 LCD Display
- Push buttons (Emergency stop, Start/Stop)
- 12V 5A Power supply

## 🌐 API Endpoints

- `GET /api/machines` - Get all machines
- `GET /api/alerts` - Get recent alerts
- `POST /api/machine/:id/command` - Send command to machine
- `GET /health` - Server health check

## 🔌 WebSocket Events

### From Arduino to Server:
- `machine_data` - Real-time sensor data

### From Dashboard to Arduino:
- `start` - Start machine
- `stop` - Stop machine
- `emergency_stop` - Emergency shutdown
- `maintenance_mode` - Set maintenance mode

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm start
```

### Arduino Development
1. Open Arduino IDE
2. Load `arduino/smart_factory_controller.ino`
3. Update `config.h` with your settings
4. Upload to your Arduino

## 📊 Features

- ✅ Real-time machine monitoring
- ✅ Remote machine control
- ✅ Alert system with severity levels
- ✅ Production analytics with charts
- ✅ Maintenance scheduling
- ✅ Emergency stop functionality
- ✅ LED status indicators
- ✅ LCD local display

## 🔍 Troubleshooting

### Arduino not connecting?
1. Check WiFi credentials in `config.h`
2. Verify server IP address
3. Ensure port 3001 is not blocked

### Dashboard not updating?
1. Check WebSocket connection status
2. Verify backend server is running
3. Check browser console for errors

### Sensors not reading?
1. Verify wiring connections
2. Check power supply
3. Test individual sensors

## 📈 Next Steps

- Add database persistence
- Implement user authentication
- Add mobile app support
- Include predictive maintenance AI
- Add email/SMS notifications

