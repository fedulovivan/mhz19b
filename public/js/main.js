(function () {

    let $container;
    let $ppm;
    let $temp;
    let $windowSize;

    let constants;
    let chart;

    window.addEventListener('load', onLoad);

    function listenWebsocket(chart) {

        console.log('listenWebsocket');

        const socket = io(`http://${constants.APP_HOST}:${constants.APP_PORT}`);
        socket.on(constants.MESSAGE_NAME, (point) => {
            const { timestamp, ppm, temperature } = point;
            const seriesPpm = chart.series[0];
            const seriesTemp = chart.series[1];
            seriesPpm.addPoint(
                [ timestamp, ppm ],
                true,
                false,
            );
            seriesTemp.addPoint(
                [ timestamp, temperature ],
                true,
                false
            );
            $ppm.textContent = ppm;
            $temp.textContent = temperature;
        });
    }

    async function onLoad() {

        console.log('onLoad');

        $container = document.getElementById('container');
        $ppm = document.getElementById('ppm');
        $temp = document.getElementById('temp');
        $windowSize = document.getElementById('windowSize');

        // load settings
        constants = await fetchJson('/constants');

        // set initially selected window size
        $windowSize.value = localStorage.getItem('windowSize') || constants.DEFAULT_WINDOW_SIZE;

        // init chart
        chart = initChart($container);

        // fetch history with points from server
        await fetchHistoryAndUpdateChart(chart, parseInt($windowSize.value, 10));

        // bind windowSize change listener
        $windowSize.addEventListener('change', e => {
            const windowSize = parseInt(e.target.value, 10);
            localStorage.setItem('windowSize', windowSize);
            fetchHistoryAndUpdateChart(chart, windowSize);
        });

        // do listen ws
        listenWebsocket(chart);

    }

    async function fetchHistoryAndUpdateChart(chart, windowSize) {
        console.log('fetchHistoryAndUpdateChart');
        chart.showLoading('Loading...');
        const points = await fetchPoints({ windowSize });
        const [ seriesPpm, seriesTemp ] = chart.series;
        seriesPpm.setData(
            points.map(([ timestamp, ppm, temperature ]) => ([timestamp, ppm])),
            true,  // redraw
            false, // disable animation (speeds up rendering of big series)
            false, // disable updatePoints (speeds up rendering of big series)
        );
        seriesTemp.setData(
            points.map(([ timestamp, ppm, temperature ]) => ([timestamp, temperature])),
            true,  // redraw
            false, // disable animation (speeds up rendering of big series)
            false, // disable updatePoints (speeds up rendering of big series)
        );
        chart.hideLoading();
    }

    async function fetchPoints({ windowSize }) {
        return fetchJson(`/json?windowSize=${windowSize}`);
    }

    async function fetchJson(url) {
        const rsp = await fetch(url);
        return rsp.json();
    }

    function initChart(container) {
        Highcharts.setOptions({
            time: {
                useUTC: false // use browser time
            }
        });
        return Highcharts.chart(container, {

            credits: {
                enabled: false
            },

            chart: {
                zoomType: 'x',
                resetZoomButton: {
                    position: {
                        y: 50
                    }
                }
            },

            boost: {
                useGPUTranslations: true
            },

            title: {
                text: null,
                // text: `co2 ppm for last ${moment().subtract(WINDOW_SECONDS, 'seconds').toNow(true)}`
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: [{
                title: {
                    text: `PPM`,
                }
            }, {
                opposite: true,
                allowDecimals: false,
                title: {
                    text: `°C`,
                }
            }],
            legend: {
                enabled: false
            },
            plotOptions: {
                area: {
                    // fillColor: {
                    //     linearGradient: {
                    //         x1: 0,
                    //         y1: 0,
                    //         x2: 0,
                    //         y2: 1
                    //     },
                    //     stops: [
                    //         [0, Highcharts.getOptions().colors[0]],
                    //         [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    //     ]
                    // },
                    marker: {
                        radius: 2
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null,
                },
                series: {
                    zones: [{
                        value: 700,
                        className: 'zone-good'
                    }, {
                        value: 1300,
                        className: 'zone-warn'
                    }, {
                        className: 'zone-bad'
                    }],
                }
            },

            series: [{
                type: 'area',
                name: 'co2 PPM',
                yAxis: 0,
            }, {
                type: 'spline',
                name: 'Temperature',
                yAxis: 1,
                color: '#bbb'
            }]

        });
    }

}());