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
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import SocketIoClient from 'socket.io-client';

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

    const [CO2, setCO2] = useState(null);

    useEffect(() => {
        const socket = SocketIoClient(`ws://${APP_HOST}:${APP_PORT}`);
        socket.on('init', ({ docs }) => {
            setDocs(docs);
        });
        socket.on('mqtt-message', (message) => {
            const { topic, payload } = message;
            console.log(topic, payload);
            if (topic === '/ESP/MH/CO2') {
                setCO2(payload);
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
                onChange={(event, key, value) => {
                    setHistoryOption(value);
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
            {CO2}
        </div>
    );

}

ReactDOM.render(
    <Root />,
    document.getElementById('root')
);