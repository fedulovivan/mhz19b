
# Summary

Test application for playing with Chineze carbon dioxide sensor MH Z19B from Aliexpress. It allows to read data from the sensor connected via serial interface, acquire PPM and temperature, persisit mentioned metrics on disk and visualize results on the chart with enabled real-time updates.

Application is written on javascript and consists of two separate modules communicating with each other:

- Sensor agent - sensor UART client which polls sensor each N seconsds and stores received amount of CO2 PPM into persistent database
- Web UI - http server which handles web UI for viewing chart with collected statistics

# Screenshots

![gui](https://raw.githubusercontent.com/fedulovivan/mhz19b/master/gui.png)
![console](https://raw.githubusercontent.com/fedulovivan/mhz19b/master/console.png)

# Steps to launch

- Connect sensor with serial adaptor
- Connect adaptor with the machine
- Discover serial device name in your OS
- Set actual name via UART_ADAPTER constant in constants.js
- Launch client app with `yarn mh` (or if you prefer `npm mh`)
- Launch http server with `yarn server` (or `npm server`)
- Head your browser to http://localhost:8888

# Requirements

- Hardware platform whcih may run nodejs (tested on 8.3.0)
- Sensor module itself
- USB to UART converter with support of 3.3v logical levels (does not required on platforms having build-in UART interface, like Raspberry PI)

# Schematics

![Schematics](https://raw.githubusercontent.com/fedulovivan/mhz19b/master/Schematics.png)
