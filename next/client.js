import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import nano from 'nano';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import moment from 'moment';
// import * as d3 from 'd3';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

const dbclient = nano('http://localhost:5984');
const db = dbclient.use('mqtt');

const MINUTE = 60 * 1000;
const HOUR = 3600 * 1000;
const DAY = HOUR * 24;

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

    useEffect(() => {
        const query = {
            selector: {
                // co2: { "$gt": 0 }
                timestamp: { "$gt": (new Date()).valueOf() - historyOption }
            },
            fields: ["co2", "timestamp"],
            limit: 10000
        };
        db.find(query).then(response => {
            setDocs(response.docs);
        });
    }, [historyOption]);


    // const now = new Date();
    // const domainToday = d3.scaleTime().domain([d3.timeDay.floor(now), d3.timeDay.ceil(now)]);
    // const timeFormatter = (tick) => {return d3.timeFormat('%H:%M:%S')(new Date(tick));};
    // const ticks = domainToday.ticks(d3.timeHour.every(1));

    return (
        <MuiThemeProvider>
            <div>
                <ResponsiveContainer width = "100%" height = {500}>
                    <LineChart data={docs}>
                        <Tooltip />
                        <Legend />
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis

                            // domain={domainToday}
                            // ticks={ticks}
                            // tickFormatter={timeFormatter}

                            dataKey="timestamp"

                            // domain = {['auto', 'auto']}
                            name = 'Time'
                            tickFormatter = {(unixTime) => moment(unixTime).format('HH:mm:ss')}
                            // type = 'number'

                            // scale='time'
                            // type='number'
                            // interval={300}
                            // name="Time"
                            // tickFormatter={v => {
                            //     return moment(v).format('HH:mm:ss');
                            // }}

                        />
                        <YAxis name="CO2" />
                        <Line dataKey="co2" dot={false}/>
                    </LineChart>
                </ResponsiveContainer>
                <SelectField
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
                                primaryText={item.name}
                            />
                        );
                    })}
                </SelectField>
                {/* <select
                    onChange={e => setHistoryOption(Number(e.target.value))}
                    value={historyOption}
                >
                    {historyOptions.map(item => {
                        return (
                            <option key={item.name} value={item.value}>
                                {item.name}
                            </option>
                        );
                    })}
                </select> */}
            </div>
        </MuiThemeProvider>
    );

}

ReactDOM.render(
    <Root />,
    document.getElementById('root')
);