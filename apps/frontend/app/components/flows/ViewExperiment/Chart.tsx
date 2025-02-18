import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables, ChartTypeRegistry } from 'chart.js';
import { BoxPlotController, BoxAndWiskers, ViolinController, Violin } from '@sgratzl/chartjs-chart-boxplot';
import 'tailwindcss/tailwind.css';
import { ExperimentData } from '../../../../lib/db_types';
import GraphModal from './ChartModal';

Chart.register(...registerables);
Chart.register(BoxPlotController, BoxAndWiskers, ViolinController, Violin);

interface ChartModalProps {
    onClose: () => void;
    project: ExperimentData;
}

const ChartModal: React.FC<ChartModalProps> = ({ onClose, project }) => {
    const [chartInstance, setChartInstance] = useState<Chart | null>(null);
    const [canvasKey, setCanvasKey] = useState(0);
    const [chartType, setChartType] = useState<keyof ChartTypeRegistry>('line');
    const [experimentChartData, setExperimentChartData] = useState({ _id: '', experimentId: '', resultContent: '' });
    const [loading, setLoading] = useState(true);
    const [xAxis, setXAxis] = useState('X');
    const [aggregateMode, setAggregateMode] = useState('sum');
    const [headers, setHeaders] = useState<string[]>([]);
    const [img, setImg] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [aggregateData, setAggregateData] = useState(false);
    const [canAggregate, setCanAggregate] = useState(true);
    const aggregateSpanRef = useRef<HTMLSpanElement>(null);
    const aggregateSelectRef = useRef<HTMLSelectElement>(null);
    const headerSpanRef = useRef<HTMLSpanElement>(null);
    const headerSelectRef = useRef<HTMLSelectElement>(null);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const setLineChart = () => { setChartType('line'); setCanAggregate(true); }
    const setBarChart = () => { setChartType('bar'); setCanAggregate(true); }
    const setPieChart = () => { setChartType('pie'); setCanAggregate(true); }
    const setBoxPlot = () => { setChartType('boxplot'); setCanAggregate(false); }
    const setViolin = () => { setChartType('violin'); setCanAggregate(false); }

    const aggregateModes = ['sum', 'count', 'average', 'median', 'mode']

    useEffect(() => {
        fetch(`/api/download/csv/${project.expId}`).then((response) => response.json()).then((record) => {
            setExperimentChartData(record);
            setLoading(false);
        }).catch((response) => {
            console.warn('Error getting experiment results', response.status);
            response.json().then((json: any) => {
                console.warn(json?.response ?? json);
                const message = json?.response;
                if (message) {
                    alert(`Error getting experiment results: ${message}`);
                }
            });
        }
        );
    }, [project.expId]);

    const downloadImage = () => {
        const a = document.createElement('a');
        a.href = img;
        a.download = `${project.name}.png`;
        a.click();
    };

    const parseCSV = (data) => {
        const rows = data.trim().split('\n');
        const headers = rows[0].split(',') as string[];
        //Create a dictionary to store the data
        const dataDict = {} as any;
        const splitRows = [] as any;

        setXAxis(headers[0]);

        for (let i = 1; i < rows.length; i++) {
            // Split the row by commas when not inside quotes
            const row = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            for (let j = 0; j < row.length; j++) {
                const val = row[j].replace(/"/g, '');
                // If the value is a number, convert it to a number
                if (!isNaN(val)) {
                    row[j] = parseFloat(val);
                }
            }
            splitRows.push(row);
        }

        // Initialize dataDict with arrays
        for (let i = 0; i < headers.length; i++) {
            dataDict[headers[i]] = [];
        }

        // Iterate through the rows and put them under the correct header
        for (let i = 0; i < splitRows.length; i++) {
            for (let j = 0; j < splitRows[i].length; j++) {
                dataDict[headers[j]].push(splitRows[i][j]);
            }
        }

        //Remove items with empty arrays
        for (let i = 0; i < headers.length; i++) {
            if (dataDict[headers[i]].length == 0) {
                delete dataDict[headers[i]];
            }
        }

        const returnHeaders = Object.keys(dataDict);
        const xIndex = headers.indexOf(xAxis);
        const xList = headers.includes(xAxis) ? dataDict[xAxis] : dataDict[headers[0]];
        const yLists = headers.map((header) => dataDict[header]);

        //If we need to aggregate the data, go through and sum the values of duplicates
        if (aggregateData && chartType != 'boxplot' && chartType != 'violin') {
            const uniqueX = Array.from(new Set(xList));
            const uniqueY = [] as any[];
            for (let i = 0; i < yLists.length; i++) {
                const yList = yLists[i];
                const uniqueYList = [] as any[];
                for (let j = 0; j < uniqueX.length; j++) {
                    const x = uniqueX[j];
                    const indices = xList.reduce((acc, e, i) => (e === x ? acc.concat(i) : acc), []);
                    if (aggregateMode == 'sum') {
                        const sum = indices.reduce((acc, e) => acc + yList[e], 0);
                        uniqueYList.push(sum);
                    }
                    else if (aggregateMode == 'count') {
                        uniqueYList.push(indices.length);
                    }
                    else if (aggregateMode == 'average') {
                        const sum = indices.reduce((acc, e) => acc + yList[e], 0);
                        uniqueYList.push(sum / indices.length);
                    }
                    else if (aggregateMode == 'median') {
                        const values = indices.map((e) => yList[e]);
                        values.sort((a, b) => a - b);
                        const half = Math.floor(values.length / 2);
                        if (values.length % 2) {
                            uniqueYList.push(values[half]);
                        }
                        else {
                            uniqueYList.push((values[half - 1] + values[half]) / 2.0);
                        }
                    }
                    else if (aggregateMode == 'mode') {
                        const values = indices.map((e) => yList[e]);
                        const mode = values.sort((a, b) =>
                            values.filter((v) => v === a).length - values.filter((v) => v === b).length
                        ).pop();
                        uniqueYList.push(mode);
                    }
                }
                uniqueY.push(uniqueYList);
            }
            return { returnHeaders, xList: uniqueX, yLists: uniqueY, xIndex };
        };

        //These need to be formatted like
        // {label: 'x1', data: [[1, 2, 3], [3, 4, 5]]}
        if (chartType == 'boxplot' || chartType == 'violin') {
            const uniqueX = Array.from(new Set(xList));
            const uniqueY = [] as any[];
            for (let i = 0; i < yLists.length; i++) {
                const yList = yLists[i];
                const uniqueYList = [] as any[];
                for (let j = 0; j < uniqueX.length; j++) {
                    const x = uniqueX[j];
                    const indices = xList.reduce((acc, e, i) => (e === x ? acc.concat(i) : acc), []);
                    const values = indices.map((e) => yList[e]);
                    uniqueYList.push(values);
                }
                uniqueY.push(uniqueYList);
            }
            return { returnHeaders, xList: uniqueX, yLists: uniqueY, xIndex };
        }
        return { returnHeaders, xList, yLists, xIndex };
    };


    const generateColors = (numColors) => {
        const colors = [] as string[];
        for (let i = 0; i < numColors; i++) {
            const color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.4)`;
            colors.push(color);
        }
        return colors;
    };

    useEffect(() => {
        if (!loading && experimentChartData.resultContent) {
            try {
                const { returnHeaders, xList, yLists, xIndex } = parseCSV(experimentChartData.resultContent);
                const headers = returnHeaders;
                const colors = generateColors(headers.length);
                const ctx = document.getElementById('myChart') as HTMLCanvasElement;

                //if we have a chart instance already, save which datasets are not hidden.
                let hiddenDatasets: Record<string, boolean> = {};
                if (chartInstance) {

                    chartInstance.data.datasets.forEach((dataset, i) => {
                        const meta = chartInstance.getDatasetMeta(i);
                        hiddenDatasets[dataset.label || `dataset_${i}`] = dataset.hidden ?? meta.hidden;
                    });
                    
                    chartInstance.destroy();
                }

                const totalLength = headers.length;
                const newHeaders = [] as any[];
                const newYLists = [] as any[];
                for (let i = 0; i < totalLength; i++) {
                    if (i != xIndex) {
                        newHeaders.push(headers[i]);
                        newYLists.push(yLists[i]);
                    }
                }

                const datasetsObj = newHeaders.map((header, i) => ({
                    label: header,
                    data: newYLists[i],
                    borderColor: colors,
                    backgroundColor: colors,
                    //hidden: hiddenDatasets[header] ?? true
                }));
                const newChartInstance = new Chart(ctx, {
                    type: chartType,
                    data: {
                        labels: xList,
                        datasets: datasetsObj
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                display: true,
                                title: {
                                    display: true,
                                    text: 'X Axis'
                                }
                            },
                            y: {
                                display: true,
                                title: {
                                    display: true,
                                    text: 'Y Axis'
                                }
                            }
                        },
                        animation: {
                            onComplete: function () {
                                setImg(newChartInstance.toBase64Image());
                            }
                        }
                    },
                    //https://stackoverflow.com/questions/66489632/how-to-export-chart-js-chart-using-tobase64image-but-with-no-transparency
                    plugins: [{
                        id: 'custom_canvas_background_color',
                        beforeDraw: (chart) => {
                            const ctx = chart.canvas.getContext('2d') as any;
                            ctx.save();
                            ctx.globalCompositeOperation = 'destination-over';
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, chart.canvas.width, chart.canvas.height);
                            ctx.restore();
                        }
                    }]
                });

                //If it is a pie chart you have to use meta
                if (chartType == 'pie') {
                    var meta = newChartInstance.getDatasetMeta(0);
                    meta.data.forEach(function (ds) {
                        (ds as any).hidden = true;
                    });
                }
                else {
                    //check whether we have the dataset saved and use its value, otherwise hide it by default
                    newChartInstance.data.datasets.forEach((dataset) => {
                        if (!(dataset.label == undefined) && dataset.label in hiddenDatasets)
                        {
                            dataset.hidden = hiddenDatasets[dataset.label];
                        }
                        else
                        {
                            dataset.hidden = true;
                        }
                    });
                }
                newChartInstance.update();

                setChartInstance(newChartInstance);

                setHeaders(headers);
            } catch (e) {
                console.warn('Error parsing CSV', e);
            }
        }

    }, [loading, experimentChartData, chartType, xAxis, isFullscreen, aggregateData, aggregateMode]);

    const regenerateCanvas = () => {
        setCanvasKey(prevKey => prevKey + 1);
    };

    useEffect(() => {
        requestAnimationFrame(() => {
            if (headerSelectRef.current && headerSpanRef.current) {
                const spanElement = headerSpanRef.current;
                spanElement.style.display = 'inline';
                headerSelectRef.current.style.width = `${spanElement.offsetWidth + 45}px`;
                spanElement.style.display = 'none';
            }
        });
      }, [xAxis, headers, loading]);

    useEffect(() => {
        if (aggregateSelectRef.current && aggregateSpanRef.current) {
            const spanElement = aggregateSpanRef.current;
            spanElement.style.display = 'inline';
            aggregateSelectRef.current.style.width = `${spanElement.offsetWidth + 45}px`;
            spanElement.style.display = 'none';
        }
      }, [aggregateMode, loading]);


    return (
        <GraphModal onClose={() => { onClose(); regenerateCanvas(); }} fullScreen={isFullscreen} toggleFullscreen={toggleFullscreen}>
            <div className='container flex items-center justify-between space-x-3'>
                <button onClick={setBarChart} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                    Bar Chart
                </button>
                <button onClick={setLineChart} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                    Line Chart
                </button>
                <button onClick={setPieChart} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                    Pie Chart
                </button>
                <button onClick={setBoxPlot} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                    Box Plot
                </button>
                <button onClick={setViolin} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                    Violin Plot
                </button>
            </div>
            <div
                className={isFullscreen ? 'p-4 h-[65vh]' : 'p-4 h-[50vh]'}>
                <h2 className='text-xl font-bold mb-4'>{project.name}&apos;s Chart</h2>
                {loading ? (
                    <p>Loading data...</p>
                ) : (
                    <div className='h-full' key={canvasKey}>
                        <canvas id='myChart'></canvas>
                    </div>
                )}
            </div>
            <div className='p-4'>
                <span ref={headerSpanRef} className="hidden">{xAxis}</span>
                <p className="font-bold">X-Axis Column:</p>
                <select
                    ref={headerSelectRef}
                    className="p-2 border rounded-md font-bold"
                    onChange={(e) => setXAxis(e.target.value)}
                    name="xaxis"
                    defaultValue={headers[0]}
                >
                    {headers.map((header) => (
                        <option key={header} value={header}>
                            {header}
                        </option>
                    ))}
                </select>

            </div>
            {canAggregate && <div className='p-4'>
                <label className='p-2' htmlFor='aggregate-data-box'>Aggregate data?</label>
                <input className='p-2' id='aggregate-data-box' type="checkbox" checked={aggregateData} onChange={() => setAggregateData(!aggregateData)}></input>
                <span ref={aggregateSpanRef} className="hidden">{aggregateMode}</span>
                {
                    aggregateData ?
                        (
                        <div className='p-4'>
                            <label className='p-2' htmlFor='aggregate-select'>Aggregate Mode:</label>
                            <br/>
                            <select
                                ref={aggregateSelectRef}
                                id='aggregate-select'
                                className="p-2 border rounded-md font-bold"
                                disabled={!aggregateData}
                                name="aggregate"
                                defaultValue='sum'
                                onChange={(e) => setAggregateMode(e.target.value)}
                            >
                                {aggregateModes.map((mode) => (
                                    <option key={mode} value={mode}>
                                        {mode}
                                    </option>
                                ))}
                            </select>
                        </div>)
                        : null
                }
            </div>}
            <button onClick={downloadImage} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                Download Image
            </button>
        </GraphModal>
    );
};

export default ChartModal;