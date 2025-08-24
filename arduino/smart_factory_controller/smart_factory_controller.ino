#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <FastLED.h>
#include <AccelStepper.h>
#include <LiquidCrystal.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* websocket_server = "192.168.1.100"; // Your computer's IP
const int websocket_port = 3001;

// Pin Definitions
#define TEMP_SENSOR_PIN 2
#define VIBRATION_SENSOR_PIN 3
#define CURRENT_SENSOR_PIN A0
#define LED_STRIP_PIN 4
#define STEPPER_STEP_PIN 5
#define STEPPER_DIR_PIN 6
#define START_BUTTON_PIN 7
#define STOP_BUTTON_PIN 8
#define EMERGENCY_STOP_PIN 9

// LCD pins (RS, Enable, D4, D5, D6, D7)
LiquidCrystal lcd(12, 11, 10, 9, 8, 7);

// Component Initialization
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature temperatureSensor(&oneWire);
AccelStepper stepper(AccelStepper::DRIVER, STEPPER_STEP_PIN, STEPPER_DIR_PIN);

#define NUM_LEDS 30
CRGB leds[NUM_LEDS];

WebSocketsClient webSocket;

// Machine State
struct MachineState {
  String machineId;
  String status; // "running", "idle", "maintenance", "error"
  float temperature;
  float vibration;
  float powerConsumption;
  int efficiency;
  int output;
  bool emergencyStop;
  bool isRunning;
};

MachineState machine;
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 1000; // Read sensors every second
const unsigned long SEND_INTERVAL = 2000;   // Send data every 2 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize machine state
  machine.machineId = "M001"; // Match your dashboard data
  machine.status = "idle";
  machine.emergencyStop = false;
  machine.isRunning = false;
  
  // Initialize components
  setupPins();
  setupWiFi();
  setupWebSocket();
  setupSensors();
  setupDisplay();
  
  Serial.println("Smart Factory Machine M001 Ready!");
}

void setupPins() {
  pinMode(VIBRATION_SENSOR_PIN, INPUT);
  pinMode(START_BUTTON_PIN, INPUT_PULLUP);
  pinMode(STOP_BUTTON_PIN, INPUT_PULLUP);
  pinMode(EMERGENCY_STOP_PIN, INPUT_PULLUP);
  
  // Initialize LED strip
  FastLED.addLeds<WS2812B, LED_STRIP_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(50);
  
  // Setup stepper motor
  stepper.setMaxSpeed(1000);
  stepper.setAcceleration(500);
}

void setupWiFi() {
  WiFi.begin(ssid, password);
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);
}

void setupWebSocket() {
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void setupSensors() {
  temperatureSensor.begin();
}

void setupDisplay() {
  lcd.begin(16, 2);
  lcd.setCursor(0, 0);
  lcd.print("Factory M001");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(1000);
}

void loop() {
  webSocket.loop();
  
  // Handle button presses
  handleButtons();
  
  // Read sensors periodically
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    readSensors();
    updateDisplay();
    updateLEDs();
    lastSensorRead = millis();
  }
  
  // Send data to dashboard
  if (millis() - lastDataSend >= SEND_INTERVAL) {
    sendMachineData();
    lastDataSend = millis();
  }
  
  // Handle machine operation
  handleMachineOperation();
}

void readSensors() {
  // Read temperature
  temperatureSensor.requestTemperatures();
  machine.temperature = temperatureSensor.getTempCByIndex(0);
  if (machine.temperature == DEVICE_DISCONNECTED_C) {
    machine.temperature = 25.0; // Default fallback
  }
  
  // Read vibration (digital sensor)
  int vibrationReading = digitalRead(VIBRATION_SENSOR_PIN);
  machine.vibration = vibrationReading ? random(15, 45) / 10.0 : random(5, 15) / 10.0;
  
  // Read current consumption
  int currentReading = analogRead(CURRENT_SENSOR_PIN);
  // Convert ADC reading to current (ACS712 30A: 66mV/A at VCC/2)
  float voltage = (currentReading * 5.0) / 1024.0;
  float current = abs((voltage - 2.5) / 0.066);
  machine.powerConsumption = current * 12.0; // Assuming 12V operation
  
  // Calculate efficiency based on machine state
  if (machine.isRunning && !machine.emergencyStop) {
    machine.efficiency = random(80, 98);
    machine.output += random(1, 3);
  } else {
    machine.efficiency = 0;
  }
  
  // Check for emergency stop
  machine.emergencyStop = !digitalRead(EMERGENCY_STOP_PIN);
  if (machine.emergencyStop) {
    machine.status = "error";
    machine.isRunning = false;
  }
}

void handleButtons() {
  static bool lastStartState = HIGH;
  static bool lastStopState = HIGH;
  
  bool startPressed = !digitalRead(START_BUTTON_PIN);
  bool stopPressed = !digitalRead(STOP_BUTTON_PIN);
  
  // Start button pressed
  if (startPressed && lastStartState && !machine.emergencyStop) {
    startMachine();
  }
  
  // Stop button pressed
  if (stopPressed && lastStopState) {
    stopMachine();
  }
  
  lastStartState = startPressed;
  lastStopState = stopPressed;
}

void startMachine() {
  if (!machine.emergencyStop) {
    machine.isRunning = true;
    machine.status = "running";
    Serial.println("Machine started via button");
    
    // Send immediate update to dashboard
    sendMachineData();
  }
}

void stopMachine() {
  machine.isRunning = false;
  machine.status = "idle";
  Serial.println("Machine stopped via button");
  
  // Send immediate update to dashboard
  sendMachineData();
}

void handleMachineOperation() {
  if (machine.isRunning && !machine.emergencyStop) {
    // Run stepper motor
    stepper.moveTo(stepper.currentPosition() + 200);
    stepper.run();
    
    // Reset position when reached
    if (stepper.distanceToGo() == 0) {
      stepper.setCurrentPosition(0);
    }
  } else {
    stepper.stop();
  }
}

void updateDisplay() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("M001 ");
  lcd.print(machine.status);
  
  lcd.setCursor(0, 1);
  lcd.print("T:");
  lcd.print(machine.temperature, 1);
  lcd.print("C E:");
  lcd.print(machine.efficiency);
  lcd.print("%");
}

void updateLEDs() {
  CRGB color;
  
  if (machine.emergencyStop) {
    color = CRGB::Red;
  } else if (machine.status == "running") {
    color = CRGB::Green;
  } else if (machine.status == "idle") {
    color = CRGB::Yellow;
  } else if (machine.status == "maintenance") {
    color = CRGB::Blue;
  } else {
    color = CRGB::Gray;
  }
  
  // Fill LED strip with status color
  fill_solid(leds, NUM_LEDS, color);
  
  // Add breathing effect for running state
  if (machine.status == "running") {
    uint8_t brightness = beatsin8(30, 50, 255);
    FastLED.setBrightness(brightness);
  } else {
    FastLED.setBrightness(100);
  }
  
  FastLED.show();
}

void sendMachineData() {
  if (webSocket.isConnected()) {
    DynamicJsonDocument doc(1024);
    
    doc["type"] = "machine_data";
    doc["machineId"] = machine.machineId;
    doc["status"] = machine.status;
    doc["temperature"] = machine.temperature;
    doc["vibration"] = machine.vibration;
    doc["powerConsumption"] = machine.powerConsumption;
    doc["efficiency"] = machine.efficiency;
    doc["output"] = machine.output;
    doc["timestamp"] = millis();
    
    String payload;
    serializeJson(doc, payload);
    webSocket.sendTXT(payload);
    
    Serial.println("Data sent: " + payload);
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      break;
      
    case WStype_CONNECTED:
      Serial.printf("WebSocket Connected to: %s\n", payload);
      // Send initial machine data
      sendMachineData();
      break;
      
    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      handleWebSocketMessage((char*)payload);
      break;
      
    default:
      break;
  }
}

void handleWebSocketMessage(String message) {
  DynamicJsonDocument doc(512);
  deserializeJson(doc, message);
  
  String command = doc["command"];
  String targetMachine = doc["machineId"];
  
  // Only respond to commands for this machine
  if (targetMachine != machine.machineId) {
    return;
  }
  
  if (command == "start") {
    startMachine();
  } else if (command == "stop") {
    stopMachine();
  } else if (command == "emergency_stop") {
    machine.emergencyStop = true;
    machine.status = "error";
    machine.isRunning = false;
    Serial.println("Emergency stop activated remotely");
  } else if (command == "reset_emergency") {
    machine.emergencyStop = false;
    machine.status = "idle";
    Serial.println("Emergency stop reset remotely");
  } else if (command == "maintenance_mode") {
    machine.status = "maintenance";
    machine.isRunning = false;
    Serial.println("Maintenance mode activated");
  }
  
  // Send updated state back to dashboard
  sendMachineData();
}
