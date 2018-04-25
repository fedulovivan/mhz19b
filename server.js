/**
 * http server for viewing chart with collected statistics
 * launch with `yarn server`
 */

const Datastore = require('nedb');
const moment = require('moment');
const Express = require('express');
const opn = require('opn');
const { size } = require('lodash/collection');
const SocketIo = require('socket.io');
const Http = require('http');
const ipc = require('node-ipc');

const {
    APP_PORT,
    APP_HOST,
    STORAGE_FILENAME,
    PUBLIC_PATH,
} = require('./const');

ipc.config.id = 'a-unique-process-name1';
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.serve(
    () => ipc.server
        .on('a-unique-message-name', message => {
            console.log('a-unique-message-name received:', message);
        })
        .on('new-ppm', message => {
            console.log('new-ppm received:', message);
        })
);
ipc.server.start();

const app = Express();
const server = Http.Server(app);
const io = SocketIo(server);

const db = new Datastore({
    filename: STORAGE_FILENAME,
    autoload: true,
    onload: err => {
        if (err) {
            console.error(`failed to load database: ${err}`);
        } else {
            console.log(`points database ${STORAGE_FILENAME} was loaded`);
        }
    }
});

io.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
      console.log(data);
    });
});

app.get(
    '/json',
    (req, res) => {

        console.log(`received request to ${req.path}`);

        if (size(req.query)) {
            console.log(`query params: ${JSON.stringify(req.query)}`);
        }

        const today = req.query.today === '1';

        const where = {
            // exclude points generated at the moment of sensor startup
            ppm: {
                $ne: 410
            },
        };

        if (today) {
            Object.assign(where, {
                timestamp: {
                    $gt: moment().startOf('day').toDate()
                },
            });
        }

        db
            .find(where)
            .sort({ timestamp: 1 })
            .exec((err, points) => {
                const json = points.map(({ timestamp, ppm }) => [timestamp.getTime(), ppm]);
                console.log(`sending response json with points`);
                res.json(json);
            });
    }
);

app.use(Express.static(PUBLIC_PATH));

server.listen(APP_PORT, (err) => {
    if (err) {
        console.error(`failed to launch server: ${err}`);
    } else {
        console.log(`listening on ${APP_HOST}:${APP_PORT}`)
        const browserLink = `http://${APP_HOST}:${APP_PORT}/`;
        console.log(`opening browser at ${browserLink}`)
        // opn(browserLink);
    }
});
