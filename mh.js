/**
 * mh z19b sensor uart client
 * polls sensor each N seconsds
 * and stores received amount of co2 ppm into persistent database
 *
 * launch with `yarn mh`
 *
 * specification for mh-z19b
 * http://www.winsen-sensor.com/d/files/infrared-gas-sensor/mh-z19b-co2-ver1_0.pdf
 *
 * sensor:
 * https://www.aliexpress.com/item/1PCS-module-MH-Z19-infrared-co2-sensor-for-co2-monitor-MH-Z19B-Free-shipping-new-stock/32371956420.html
 *
 * https://mysku.ru/blog/aliexpress/59397.html
 */

const SerialPort = require('serialport');
const Datastore = require('nedb');
const ipc = require('node-ipc');
const internalBus = new (require('events'))();

const {
    APP_PORT,
    STORAGE_FILENAME,
    PUBLIC_PATH,
    UART_ADAPTER,
    MH_REQUEST_INTERVAL,
    IPC_ID_HTTP_SERVER,
    IPC_ID_MH,
    MESSAGE_NAME,
} = require('./const');

const GET_CO2_REQUEST = Buffer.from([
    0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79
]);

// init IPC client
ipc.config.id = IPC_ID_MH;
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.connectTo(IPC_ID_HTTP_SERVER, () => {
    console.log(`ipc client id=${IPC_ID_MH} is ready to communicate with server id=${IPC_ID_HTTP_SERVER}`);
    const ipcClient = ipc.of[IPC_ID_HTTP_SERVER];
    internalBus.on(MESSAGE_NAME, point => ipcClient.emit(MESSAGE_NAME, point));
});

// init serial port
const port = new SerialPort(
    UART_ADAPTER,  {
        baudRate: 9600,
    }
);
port.on('data', onPortData);
port.on('open', onPortOpen);
port.on('error', onPortError);

// init database
const db = new Datastore({
    filename: STORAGE_FILENAME,
    autoload: true
});

function calculateCrc(buffer) {
    const sumOfBytes1to7 = buffer
        .slice(1, 8)
        .reduce((sum, intVal) => sum + intVal, 0);
    const sumWithInvertedBits = parseInt(
        sumOfBytes1to7
            .toString(2)
            .split('')
            .map(ch => ch === '1' ? '0' : '1')
            .join(''),
        2
    );
    return sumWithInvertedBits + 1;
}

function sendCO2Request() {
    console.log('sent bytes: ', GET_CO2_REQUEST);
    port.write(GET_CO2_REQUEST, function(err) {
        if (err) {
            console.log('write error: ', err);
        }
    });
}

function onPortData(buffer) {

    console.log('received bytes: ', buffer);

    const crc = calculateCrc(buffer);

    const receivedCrc = buffer[8];

    const startByte = buffer[0];
    const sensorNum = buffer[1];
    const co2HighByte = buffer[2];
    const co2LowByte = buffer[3];
    const temperatureRaw = buffer[4];

    if (startByte === 0xFF && sensorNum === 0x86) {

        if (receivedCrc === crc) {

            const ppm = (256 * co2HighByte) + co2LowByte;

            const temperature = temperatureRaw - 40;

            console.log(`measured ppm: ${ppm} and temperature: ${temperature}`);

            const timestamp = new Date();

            db.insert({
                timestamp,
                ppm,
                temperature,
            });

            internalBus.emit(MESSAGE_NAME, {
                timestamp: timestamp.getTime(),
                ppm,
                temperature,
            });

        } else {

           console.log(`checksum error`);
           console.log('crc', crc);
           console.log('receivedCrc', receivedCrc);

       }

    } else {
        console.log(`unexpexted first two bytes of response`);
    }
}

function onPortOpen() {
    console.log(`serial port was opened`);
    sendCO2Request();
    setInterval(sendCO2Request, MH_REQUEST_INTERVAL);
}

function onPortError(err) {
    console.error(err);
}
