import {
    APP_HOST,
    APP_PORT,
    MINUTE,
    HOUR,
    DAY
} from './constants';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import SocketIoClient from 'socket.io-client';
import classNames from 'classnames';

import {
    XYPlot,
    LineSeries,
    VerticalGridLines,
    HorizontalGridLines,
    XAxis,
    YAxis,
} from 'react-vis';

import { makeStyles } from '@material-ui/core/styles';
import Select from '@material-ui/core/Select';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import grey from '@material-ui/core/colors/grey';

import 'react-vis/dist/style.css';

const useStyles = makeStyles({
    root: {
    },
    cards: {
        display: 'grid',
        gridAutoFlow: 'column',
        gridColumnGap: '24px',
        justifyContent: 'start',
    },
    card: {
        display: 'grid',
        gridAutoFlow: 'column',
    },
    unit: {
        alignSelf: 'start',
        color: grey[500],
    },
    value: {
        // TBD
    },
    options: {
        minWidth: '120px'
    }
});

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
    const [error, setError] = useState(null);

    useEffect(() => {
        const io = SocketIoClient(`ws://${APP_HOST}:${APP_PORT}`, {
            query: { historyOption },
        });
        setSocket(io);
        io.on('bootstrap', ({ docs, error }) => {
            setDocs(docs);
            setError(error);
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

    const classes = useStyles(/* props */);

    const data = [
        {x: 0, y: 1},
        {x: 1, y: 2},
        {x: 2, y: 4},
        {x: 3, y: 16},
        {x: 4, y: 15},
        {x: 5, y: 10},
        {x: 6, y: 9},
        {x: 7, y: 8},
        {x: 8, y: 3},
        {x: 9, y: 1}
    ];

    return (
        <div className={classes.root}>
            <div className={classes.cards}>
                <Card>
                    <CardContent className={classNames(classes.card, classes.options)}>
                        <FormControl>
                            <InputLabel>History Window</InputLabel>
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
                        </FormControl>
                    </CardContent>
                </Card>
                <Card>
                    <XYPlot width={300} height={200}>
                        <XAxis />
                        <YAxis />
                        <VerticalGridLines />
                        <HorizontalGridLines />
                        <LineSeries data={data} />
                    </XYPlot>
                </Card>
                <Card>
                    <CardContent className={classes.card}>
                        <Typography className={classes.value} variant="h2">
                            {CO2}
                        </Typography>
                        <Typography className={classes.unit} variant="h5">
                            CO2
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className={classes.card}>
                        <Typography className={classes.value} variant="h2">
                            {temperature}
                        </Typography>
                        <Typography className={classes.unit} variant="h5">
                            C
                        </Typography>
                    </CardContent>
                </Card>
            </div>
            error: {error}
        </div>
    );

}

ReactDOM.render(
    <Root />,
    document.getElementById('root')
);
