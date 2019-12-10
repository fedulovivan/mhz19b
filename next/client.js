import {
    APP_HOST,
    APP_PORT,
    PUBLIC_PATH,
    MINUTE,
    HOUR,
    DAY
} from './constants';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import moment from 'moment';
import SocketIoClient from 'socket.io-client';

import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';

function Root() {

    const historyOptions = [
        { name: "1 minute", value: MINUTE },
        { name: "30 minutes", value: MINUTE * 30 },
        { name: "1 hour", value: HOUR },
        { name: "4 hours", value: HOUR * 4 },
        { name: "1 day", value: DAY },
    ];

    const [docs, setDocs] = useState([])

    const [historyOption, setHistoryOption] = useState(HOUR);

    const [CO2, setCO2] = useState(0);

    const [temperature, setTemperature] = useState(0);

    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const io = SocketIoClient(`ws://${APP_HOST}:${APP_PORT}`, {
            query: { historyOption },
        });
        setSocket(io);
        io.on('init', ({ docs }) => {
            setDocs(docs);
        });
        io.on('mqtt-message', (message) => {
            console.log(message);
            const { topic, parsed, raw } = message;
            if (topic === '/ESP/MH/CO2') {
                setCO2(parsed);
            }
            if (topic === '/ESP/MH/TEMP') {
                setTemperature(parsed);
            }
        });
    }, []);

    return (
        <div>
            <ResponsiveContainer width = "100%" height = {500}>
                <LineChart data={docs}>
                    <Tooltip />
                    <Legend />
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="timestamp"
                        name = 'Time'
                        tickFormatter = {(unixTime) => moment(unixTime).format('HH:mm:ss')}
                    />
                    <YAxis name="CO2" />
                    <Line dataKey="co2" dot={false}/>
                </LineChart>
            </ResponsiveContainer>
            <Select
                value={historyOption}
                onChange={(event) => {
                    const value = parseInt(event.target.value, 10);
                    setHistoryOption(value);
                    socket.emit("setHistoryOption", value);
                }}
            >
                {historyOptions.map(item => {
                    return (
                        <MenuItem
                            value={item.value}
                            key={item.value}
                        >{item.name}</MenuItem>
                    );
                })}
            </Select>
            <Paper>{CO2}</Paper>
            <Paper>{temperature}</Paper>
        </div>
    );

}

ReactDOM.render(
    <Root />,
    document.getElementById('root')
);