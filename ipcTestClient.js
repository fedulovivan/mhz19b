const ipc = require('node-ipc');

ipc.config.id = 'a-unique-process-name2';
ipc.config.retry = 1500;
ipc.config.silent = true;

ipc.connectTo('a-unique-process-name1', () => {

    const observer = ipc.of['a-unique-process-name1'];

  observer.on('connect', () => {

    observer.emit('a-unique-message-name', "The message we send");

    setInterval(() => {

        observer.emit('new-ppm', [1, 2, Math.random()]);

    }, 1000);

  });
});