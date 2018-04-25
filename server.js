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

let ipcServer;

async function getIPC() {
    return new Promise((resolve, reject) => {
        ipc.config.id = 'a-unique-process-name1';
        ipc.config.retry = 1500;
        ipc.config.silent = true;
        ipc.serve(() => resolve(ipc.server));
        ipc.server.start();
    });
}

// () => ipc.server.on('ppm', point => {
//     console.log('new ppm received:', point);
// })

const app = Express();
const server = Http.Server(app);
const io = SocketIo(server);

const db = new Datastore({
    filename: STORAGE_FILENAME,
    autoload: false,
    // onload: err => {
    //     if (err) {
    //         console.error(`failed to load database: ${err}`);
    //     } else {
    //         console.log(`points database ${STORAGE_FILENAME} was loaded`);
    //     }
    // }
});

// async function acquireIOConn() {
//     return new Promise((resolve, reject) => {
//         io.on('connection', socket => resolve(socket));
//     });
// }

io.on('connection', async function(socket) {

    console.log('new io connection');

    if (!ipcServer) {
        console.log('awaiting ipc server to init');
        ipcServer = await getIPC();
    } else {
        console.log('ipc server already initialized');
    }

    console.log('ipc server ready');

    ipcServer.on('ppm', point => socket.emit('ppm', point));

});

// TODO do not forget to delete ipc listener on io disconnect

app.get(
    '/json',
    (req, res) => {

        console.log(`received request to ${req.path}`);

        if (size(req.query)) {
            console.log(`query params: ${JSON.stringify(req.query)}`);
        }

        // const today = req.query.today === '1';

        const where = {
            // exclude points generated at the moment of sensor startup
            ppm: {
                $ne: 410
            },
        };

        // if (today) {
        // }

        Object.assign(where, {
            timestamp: {
                // $gt: moment().startOf('day').toDate()
                $gt: moment().subtract(1, 'hour')
            },
        });

        db.loadDatabase(() => {
            db
            .find(where)
            .sort({ timestamp: 1 })
            .exec((err, points) => {
                const json = points.map(({ timestamp, ppm }) => [timestamp.getTime(), ppm]);
                console.log(`sending response json with points`);
                res.json(json);
            });
        });

        // .limit(30)
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
