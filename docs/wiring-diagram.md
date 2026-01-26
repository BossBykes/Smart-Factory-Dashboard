# Arduino Wiring Diagram

## Component Connections

### ESP8266 WiFi Module
- VCC → 3.3V
- GND → GND
- TX → Pin 2 (SoftwareSerial)
- RX → Pin 3 (SoftwareSerial)

### DS18B20 Temperature Sensor
- VCC → 5V
- GND → GND
- Data → Digital Pin 2 (with 4.7kΩ pullup resistor)

### SW-420 Vibration Sensor
- VCC → 5V
- GND → GND
- DO → Digital Pin 3

### ACS712 Current Sensor
- VCC → 5V
- GND → GND
- OUT → Analog Pin A0

### WS2812B LED Strip
- VCC → 5V
- GND → GND
- DIN → Digital Pin 4

### NEMA 17 Stepper Motor Driver
- VCC → 12V
- GND → GND
- STEP → Digital Pin 5
- DIR → Digital Pin 6

### LCD Display (16x2)
- VSS → GND
- VDD → 5V
- V0 → 10kΩ potentiometer (contrast)
- RS → Digital Pin 12
- Enable → Digital Pin 11
- D4 → Digital Pin 10
- D5 → Digital Pin 9
- D6 → Digital Pin 8
- D7 → Digital Pin 7

### Push Buttons
- Start Button → Digital Pin 7 (with pullup)
- Stop Button → Digital Pin 8 (with pullup)
- Emergency Stop → Digital Pin 9 (with pullup)

## Power Distribution
- 12V Supply → Stepper Driver, LED Strip
- 5V (from Arduino) → Sensors, LCD
- 3.3V (from Arduino) → ESP8266

## Safety Notes
- Always use appropriate fuses
- Ensure proper grounding
- Use optoisolators for high-power devices
- Implement proper emergency stop circuit

