import React, { useState, useEffect } from 'react';
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
    //const [yAxis, setYAxis] = useState('Y');
    const [headers, setHeaders] = useState<string[]>([]);
    const [img, setImg] = useState<string>('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [aggregateData, setAggregateData] = useState(false);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const setLineChart = () => setChartType('line');
    const setBarChart = () => setChartType('bar');
    const setPieChart = () => setChartType('pie');
    const setBoxPlot = () => setChartType('boxplot');
    const setViolin = () => setChartType('violin');

    /*useEffect(() => {
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
    }, [project.expId]);*/

    useEffect(() => {
        setExperimentChartData({_id: '3', experimentId: project.expId, resultContent: 'xData,yData,Classification\n1,7,A\n2,16,B\n3,12,C\n4,10,D\n5,9,A\n6,18,B\n7,12,C\n8,11,D\n9,7,A\n10,5,B\n11,16,C\n12,20,D\n13,0,A\n14,12,B\n15,18,C\n16,3,D\n17,7,A\n18,8,B\n19,19,C\n20,4,D'});
        setLoading(false);
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

        if (aggregateData)
        {
            const xList = [] as any;
            const xIndex = headers.includes(xAxis) ? headers.indexOf(xAxis) : 0;

            //initialize xList with all of the x values
            for (let i = 0; i < splitRows.length; i++)
            {
                const xValue = splitRows[i][xIndex];
                if (!xList.includes(xValue))
                {
                    xList.push(xValue);
                    //add new array for aggregate data
                    for (let j = 0; j < headers.length; j++) {
                        dataDict[headers[j]].push([]);
                    }
                }
            }

            for (let i = 0; i < splitRows.length; i++)
            {
                const xValue = splitRows[i][xIndex];
                const xValueIndex = xList.indexOf(xValue);
                for (let j = 0; j < splitRows.length; j++)
                {
                    dataDict[headers[j]][xValueIndex].push(splitRows[i][j]);
                }
            }

            const returnHeaders = Object.keys(dataDict);
            const yLists = headers.map((header) => dataDict[header]);
            return { returnHeaders, xList, yLists, xIndex };
        }
        else
        {

            // Iterate through the rows and put them under the correct header
            for (let i = 1; i < splitRows.length; i++) {
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
            return { returnHeaders, xList, yLists, xIndex };
        }
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
            const { returnHeaders, xList, yLists, xIndex } = parseCSV(experimentChartData.resultContent);
            const headers = returnHeaders;
            const colors = generateColors(xList.length);
            const ctx = document.getElementById('myChart') as HTMLCanvasElement;
            if (chartInstance) {
                chartInstance.destroy();
            }

            const totalLength = headers.length;
            const newHeaders = [] as any[];
            for (let i = 0; i < totalLength; i++) {
                if (i != xIndex) {
                    newHeaders.push(headers[i]);
                }
            }

            const datasetsObj = newHeaders.map((header, i) => ({
                label: header,
                data: yLists[i],
                borderColor: colors,
                backgroundColor: colors
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
                }
            });
            setChartInstance(newChartInstance);

            setHeaders(headers);
        }
    }, [loading, experimentChartData, chartType, xAxis, isFullscreen, aggregateData]);

    const regenerateCanvas = () => {
        setCanvasKey(prevKey => prevKey + 1);
    };


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
                <p className="font-bold">X-Axis Column:</p>
                <select
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
            <div className='p-4'>
                <label><input id='aggregate-data-box' type="checkbox" checked={aggregateData} onChange={() => setAggregateData(!aggregateData)}></input>Aggregate data?</label>
            </div>
            <button onClick={downloadImage} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                Download Image
            </button>
        </GraphModal>
    );
};

export default ChartModal;