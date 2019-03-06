/**
 * http server for viewing chart with collected statistics
 * launch with `yarn server`
 */

const Datastore = require('nedb');
const moment = require('moment');
const compression = require('compression');
const Express = require('express');
const { size } = require('lodash/collection');
const SocketIo = require('socket.io');
const Http = require('http');
const ipc = require('node-ipc');
const internalBus = new (require('events'))();
const debug = require('debug')('mhz19b');

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
ipc.server.on('start', () => debug(`started ipc server id=${IPC_ID_HTTP_SERVER}`));
ipc.server.on(MESSAGE_NAME, point => internalBus.emit(MESSAGE_NAME, point));
ipc.server.on('connect', socket => {
    const clientId = ++ipcClientIdSeq;
    debug(`new ipc client connection id=${clientId}`);
    socket.on('close', () => debug(`ipc client id=${clientId} socket closed`));
});
ipc.server.start();

const app = Express();
const server = Http.Server(app);
app.use(compression());
const io = SocketIo(server, { origins: 'http://localhost:8888' });

const db = new Datastore({
    filename: STORAGE_FILENAME,
    autoload: false,
});
// db.ensureIndex({ fieldName: 'timestamp' });

io.on('connection', function(socket) {
    debug(`new ws connection id=${socket.id}`);
    const ppmHandler = point => socket.emit(MESSAGE_NAME, point);
    internalBus.on(MESSAGE_NAME, ppmHandler);
    socket.on('disconnect', () => {
        debug(`ws id=${socket.id} disconnected`);
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

        debug(`received request to ${req.path}`);

        if (size(req.query)) {
            debug(`query params: ${JSON.stringify(req.query)}`);
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
                    // reduce max amount of points in response
                    const maxPoints = 3000;
                    const totalPoints = points.length;
                    const eachN = Math.max(1, Math.floor(totalPoints / maxPoints));
                    debug(`Fetched ${totalPoints} points from DB, max in response = ${maxPoints}. Going to take each ${eachN} point`);
                    const jsonArray = [];
                    points.forEach(({ timestamp, ppm, temperature }, index) => {
                        if (index % eachN === 0) {
                            jsonArray.push([timestamp.getTime(), ppm, temperature]);
                        }
                    });
                    debug(`Result was reduced to ${jsonArray.length} points`);
                    const delta = Date.now() - tick;
                    debug(`data prepared in ${delta}ms, sending response`);
                    res.json(jsonArray);
                });
        });

    }
);

app.use(Express.static(PUBLIC_PATH));

server.listen(APP_PORT, (err) => {
    if (err) {
        debug(`failed to launch server: ${err}`);
    } else {
        debug(`listening on ${APP_HOST}:${APP_PORT}`)
        const browserLink = `http://${APP_HOST}:${APP_PORT}/`;
        debug(`open browser at ${browserLink}`)
    }
});

// opn(browserLink);
