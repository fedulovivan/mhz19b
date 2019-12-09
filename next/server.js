import Express from 'express';
import SocketIo from 'socket.io';
import Mqtt from 'mqtt';
import Http from 'http';
import Debug from 'debug';
import Nano from 'nano';

import {
    APP_HOST,
    APP_PORT,
    PUBLIC_PATH,
    MQTT_USERNAME,
    MQTT_PASSWORD,
    MQTT_HOST,
    MQTT_PORT,
    COACHDB_HOST,
    COACHDB_PORT,
} from './constants.js';

const debug = Debug('next-server');

const express = Express();
const server = Http.Server(express);

const io = SocketIo(server, { origins: `http://${APP_HOST}:${APP_PORT}` });

const mqttClient = Mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
});

const coachdbClient = Nano(`http://${COACHDB_HOST}:${COACHDB_PORT}`);
const mqttDb = coachdbClient.db.use('mqtt');
const configsDb = coachdbClient.db.use('configs');

mqttClient.on('connect', async function () {
    mqttClient.subscribe([
        'zigbee2mqtt/#',
        'homeassistant/#',
        '/ESP/MH/#',
        // '/ESP/MH/CO2',
        // '/ESP/MH/TEMP',
    ]);
});

mqttClient.on('message', async function (topic, message) {
    console.log('\ntopic:', topic);
    const messageString = message.toString();
    let payloadJson = null;
    try {
        payloadJson = JSON.parse(messageString);
        console.log('json:', payloadJson);
    } catch(e) {
        console.log('string:', messageString);
    }
    if ((topic.startsWith('homeassistant/sensor') || topic.startsWith('homeassistant/binary_sensor')) && payloadJson) {
        try {
            await configsDb.insert(payloadJson);
        } catch (e) {
            console.error(e);
        }
    }
    if (topic === '/ESP/MH/CO2') {
        const co2 = parseInt(message, 10);
        const timestamp = (new Date).valueOf();
        try {
            const res = await mqttDb.insert({
                co2,
                timestamp,
            });
            // console.log(res);
        } catch (e) {
            console.error(e);
        }
    }
    io.sockets.emit('mqtt-message', { topic, payload: payloadJson });
});

// app.use('/api', api);

express.use(Express.static(PUBLIC_PATH));

server.listen(APP_PORT, (err) => {
    if (err) {
        debug(`failed to launch server: ${err}`);
    } else {
        debug(`listening on ${APP_HOST}:${APP_PORT}`)
        const browserLink = `http://${APP_HOST}:${APP_PORT}/`;
        debug(`open browser at ${browserLink}`)
    }
});

io.on('connection', function(socket) {

    debug(`new ws connection id=${socket.id}`);

    const query = {
        selector: {
            timestamp: { "$gt": 0/* (new Date()).valueOf() - historyOption */ }
        },
        fields: ["co2", "timestamp"],
        limit: 1000
    };
    mqttDb.find(query).then(response => {
        socket.emit('init', { docs: response.docs });
    });

    // setInterval(() => {
    //     socket.emit('init', Math.random());
    // }, 10);

    socket.on('disconnect', () => {
        debug(`ws id=${socket.id} disconnected`);
    });

});
