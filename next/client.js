import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import nano from 'nano';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import moment from 'moment';

const dbclient = nano('http://localhost:5984');
const db = dbclient.use('mqtt');

function Root() {

    const [docs, setDocs] = useState([])

    useEffect(() => {
        const query = {
            selector: {
                co2: { "$gt": 0 }
            },
            fields: ["co2", "timestamp"],
            limit: 10000
        };
        db.find(query).then(response => {
            setDocs(response.docs);
        });
    }, []);

    console.log(docs);

    return (
        <LineChart width={1200} height={300} data={docs}>
            <Tooltip />
            <Legend />
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis name="Time" dataKey="timestamp" interval={100} tickFormatter={v => {
                return moment(v).format('HH:mm');
                // const d = new Date(v);
                // return `${d.getHours()}:${d.getMinutes()}`;
            }} />
            <YAxis name="CO2" />
            <Line dataKey="co2" dot={false}/>
        </LineChart>
    );

}

ReactDOM.render(
    <Root />,
    document.getElementById('root')
);