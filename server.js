/**
 * http server for viewing chart with collected statistics
 * launch with `yarn server`
 */

const Datastore = require('nedb');
const moment = require('moment');
const Express = require('express');
const { size } = require('lodash/collection');
const SocketIo = require('socket.io');
const Http = require('http');
const ipc = require('node-ipc');
const internalBus = new (require('events'))();
// const opn = require('opn');

const constants = require('./const');
const {
    APP_PORT,
    APP_HOST,
    STORAGE_FILENAME,
    PUBLIC_PATH,
    IPC_ID_HTTP_SERVER,
    // WINDOW_SECONDS,
    MESSAGE_NAME,
} = constants;

// init IPC server
let ipcClientIdSeq = 0;
ipc.config.id = IPC_ID_HTTP_SERVER;
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.serve();
ipc.server.on('start', () => console.log(`started ipc server id=${IPC_ID_HTTP_SERVER}`));
ipc.server.on(MESSAGE_NAME, point => internalBus.emit(MESSAGE_NAME, point));
ipc.server.on('connect', socket => {
    const clientId = ++ipcClientIdSeq;
    console.log(`new ipc client connection id=${clientId}`);
    socket.on('close', () => console.log(`ipc client id=${clientId} socket closed`));
});
// ipc.server.on('error', error => console.error(`error: ${error}`));
ipc.server.start();

const app = Express();
const server = Http.Server(app);
const io = SocketIo(server);

const db = new Datastore({
    filename: STORAGE_FILENAME,
    autoload: false,
});

io.on('connection', function(socket) {
    console.log(`new ws connection id=${socket.id}`);
    const ppmHandler = point => socket.emit(MESSAGE_NAME, point);
    internalBus.on(MESSAGE_NAME, ppmHandler);
    socket.on('disconnect', () => {
        console.log(`ws id=${socket.id} disconnected`);
        internalBus.removeListener(MESSAGE_NAME, ppmHandler);
    });
});

app.get(
    '/constants',
    (req, res) => res.json(constants)
);

app.get(

    '/json',

    (req, res) => {

        const tick = Date.now();

        console.log(`received request to ${req.path}`);

        if (size(req.query)) {
            console.log(`query params: ${JSON.stringify(req.query)}`);
        }

        const windowSize = parseInt(req.query.windowSize, 10);

        const where = {
            ppm: {
                // exclude points generated at the moment of sensor startup
                $ne: 410
            },
            timestamp: {
                $gt: moment().subtract(windowSize, 'seconds')
            },
        };

        db.loadDatabase(error => {
            if (error) {
                return res.json({ error });
            }
            db
            .find(where)
            .sort({ timestamp: 1 })
            .exec((err, points) => {
                const json = points.map(({ timestamp, ppm }) => [timestamp.getTime(), ppm]);
                const delta = Date.now() - tick;
                console.log(`data prepared in ${delta}ms, sending response`);
                res.json(json);
            });
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
        console.log(`open browser at ${browserLink}`)
    }
});

// opn(browserLink);
