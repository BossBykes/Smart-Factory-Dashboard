#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration - UPDATE THESE!
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Server Configuration - UPDATE WITH YOUR COMPUTER'S IP!
#define WEBSOCKET_SERVER "192.168.1.100"
#define WEBSOCKET_PORT 3001

// Machine Configuration
#define MACHINE_ID "M001"
#define MACHINE_NAME "CNC Mill Alpha"
#define MACHINE_TYPE "CNC"

// Pin Configuration (adjust based on your wiring)
#define TEMP_SENSOR_PIN 2
#define VIBRATION_SENSOR_PIN 3
#define CURRENT_SENSOR_PIN A0
#define LED_STRIP_PIN 4
#define STEPPER_STEP_PIN 5
#define STEPPER_DIR_PIN 6
#define START_BUTTON_PIN 7
#define STOP_BUTTON_PIN 8
#define EMERGENCY_STOP_PIN 9

// LCD Configuration
#define LCD_RS 12
#define LCD_ENABLE 11
#define LCD_D4 10
#define LCD_D5 9
#define LCD_D6 8
#define LCD_D7 7

// Sensor Configuration
#define NUM_LEDS 30
#define TEMPERATURE_THRESHOLD 75.0
#define VIBRATION_THRESHOLD 3.5

#endif
