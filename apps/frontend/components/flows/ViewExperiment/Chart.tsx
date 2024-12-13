import React, { useState, useEffect } from 'react';
import { Chart, registerables, ChartTypeRegistry } from 'chart.js';
import { BoxPlotController, BoxAndWiskers, ViolinController, Violin } from '@sgratzl/chartjs-chart-boxplot';
import Modal from './Modal'; // Assuming you have a Modal component
import 'tailwindcss/tailwind.css';
import { ExperimentData } from '../../../firebase/db_types';
import { getExperimentDataForGraph } from '../../../firebase/db';
import { Menu } from '@headlessui/react'

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

    const setLineChart = () => setChartType('line');
    const setBarChart = () => setChartType('bar');
    const setPieChart = () => setChartType('pie');
    const setBoxPlot = () => setChartType('boxplot');
    const setViolin = () => setChartType('violin');

    /*useEffect(() => {
        fetch(`/api/download/csv/671a908532c499e45424f25c`).then((response) => response.json()).then((record) => {
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
        setExperimentChartData({_id: '3', experimentId: project.expId, resultContent: 'time,max,avg,min\n0,0.8,0.54,0.3\n10,0.8,0.58,0.4\n20,0.8,0.66,0.5\n30,0.8,0.65,0.4\n40,0.8,0.63,0.5\n50,0.8,0.68,0.5\n60,0.8,0.61,0.3\n70,0.8,0.67,0.4\n80,0.9,0.67,0.4\n90,0.9,0.72,0.4'});
        setLoading(false);
    }, [project.expId]);

    //console.log(experimentChartData.resultContent);

   
    const parseCSV = (data) => {
        const rows = data.trim().split('\n');
        const headers = rows[0].split(',');

        const xList = [] as any[];
        const yLists = [] as any[];

        var xIndex = 0;
        for (let i = 0; i < headers.length; i++)
        {
            yLists.push([]);
            if (headers[i] === xAxis)
            {
                xIndex = i;
            }
        }

        yLists.splice(xIndex, 1);

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            xList.push(cols[xIndex]);
            for (let j = 0; j < cols.length; j++)
            {
                if (j < xIndex)
                {
                    yLists[j].push(cols[j]);
                }
                else if (j > xIndex)
                {
                    yLists[j - 1].push(cols[j]);
                }
            }
        }

        console.log("Headers:", headers);
        console.log("X List:", xList);
        console.log("Y Lists:", yLists);

        return { headers, xList, yLists, xIndex };
    };

    const generateColors = (numColors) => {
        const colors = [] as string[];
        for (let i = 0; i < numColors; i++) {
            const color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.2)`;
            colors.push(color);
        }
        return colors;
    };

    useEffect(() => {
        if (!loading && experimentChartData.resultContent) {
            const { headers, xList, yLists, xIndex } = parseCSV(experimentChartData.resultContent);
            const colors = generateColors(xList.length);
            const ctx = document.getElementById('myChart') as HTMLCanvasElement;
            if (chartInstance) {
                chartInstance.destroy();
            }

            const totalLength = headers.length;
            const newHeaders = [] as any[];
            for (let i = 0; i < totalLength; i++)
            {
                if (i != xIndex)
                {
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
                    }
                }
            });
            setChartInstance(newChartInstance);

            setHeaders(headers);
        }
    }, [loading, experimentChartData, chartType, xAxis]);

    const regenerateCanvas = () => {
        setCanvasKey(prevKey => prevKey + 1);
    };
    

    return (
        <Modal onClose={() => { onClose(); regenerateCanvas(); }}>
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
                    Violin
                </button>
            </div>
            <div className='p-4'>
                <h2 className='text-xl font-bold mb-4'>{project.name}&apos;s Chart</h2>
                {loading ? (
                    <p>Loading data...</p>
                ) : (
                    <div key={canvasKey}>
                        <canvas id='myChart'></canvas>
                    </div>
                )}
            </div>
            <fieldset>
                {headers.map((header) => (
                    <div key={header}>
                    <input
                        type="radio"
                        id={header}
                        onChange={() => setXAxis(header)}
                        name = "xaxis"
                        value={header}
                    />
                    <label htmlFor={header}>{header}</label>
                    </div>
                ))}
            </fieldset>
        </Modal>
    );
};

export default ChartModal;