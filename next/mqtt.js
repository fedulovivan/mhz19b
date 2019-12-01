const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://192.168.88.207:1883', {
    username: "mosquitto",
    password: "5Ysm3jAsVP73nva",
});

const nano = require('nano')('http://localhost:5984');
const db = nano.db.use('mqtt');

client.on('connect', async function () {
    client.subscribe('/ESP/MH/#');
});

client.on('message', async function (topic, message) {
    console.log(topic, message.toString());
    if (topic === '/ESP/MH/CO2') {
        const co2 = parseInt(message, 10);
        const timestamp = (new Date).valueOf();
        try {
            const res = await db.insert({
                co2,
                timestamp,
            });
            console.log(res);
        } catch (e) {
            console.error(e);
        }
    }
});
