import React, { useState, useEffect } from 'react';
import { Chart, registerables, ChartTypeRegistry } from 'chart.js';
import {IBoxPlot} from '@sgratzl/chartjs-chart-boxplot';
import Modal from './Modal'; // Assuming you have a Modal component
import 'tailwindcss/tailwind.css';
import { ExperimentData } from '../../../firebase/db_types';
import { getExperimentDataForGraph } from '../../../firebase/db';

Chart.register(...registerables);

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

    const setLineChart = () => setChartType('line');
    const setBarChart = () => setChartType('bar');
    const setPieChart = () => setChartType('pie');
    const setBoxPlot = () => setChartType('boxplot');
    const setViolin = () => setChartType('violin');

    useEffect(() => {
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
    }, [project.expId]);

    console.log(experimentChartData.resultContent);

   
    const parseCSV = (data) => {
        const rows = data.trim().split('\n');
        const headers = rows[0].split(',');

        const xList = [] as any[];
        const yList = [] as any[];

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            xList.push(cols[3]); // Assuming x values are in the 4th column
            yList.push(Number(cols[4])); // Assuming y values are in the 5th column
        }

        return { xList, yList };
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
            const { xList, yList } = parseCSV(experimentChartData.resultContent);
            const colors = generateColors(xList.length);
            const ctx = document.getElementById('myChart') as HTMLCanvasElement;
            if (chartInstance) {
                chartInstance.destroy();
            }
            const newChartInstance = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: xList,
                    datasets: [{
                        label: 'Experiment Data',
                        data: yList,
                        borderColor: colors,
                        backgroundColor: colors,
                    }]
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
        }
    }, [loading, experimentChartData, chartType]);

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
        </Modal>
    );
};

export default ChartModal;