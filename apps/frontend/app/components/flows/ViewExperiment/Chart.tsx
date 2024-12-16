import React, { useState, useEffect } from 'react';
import { Chart, registerables, ChartTypeRegistry } from 'chart.js';
import { BoxPlotController, BoxAndWiskers, ViolinController, Violin } from '@sgratzl/chartjs-chart-boxplot';
import Modal from './Modal'; // Assuming you have a Modal component
import 'tailwindcss/tailwind.css';
import { ExperimentData } from '../../../../lib/db_types';
import { getExperimentDataForGraph } from '../../../../lib/db';
import { Menu } from '@headlessui/react'
import ModalContent from './ModalContent';
import ChartContent from './ChartContent';

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
    const [img, setImg] = useState<Base64URLString>('');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const setLineChart = () => setChartType('line');
    const setBarChart = () => setChartType('bar');
    const setPieChart = () => setChartType('pie');
    const setBoxPlot = () => setChartType('boxplot');
    const setViolin = () => setChartType('violin');

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
        a.download = 'downloaded-chart-image.png';
        a.click();
    };

    const parseCSV = (data) => {
        const rows = data.trim().split('\n');
        const headers = rows[0].split(',');

        const xList = [] as any[];
        const yLists = [] as any[];

        var xIndex = 0;
        for (let i = 0; i < headers.length; i++) {
            yLists.push([]);
            if (headers[i] === xAxis) {
                xIndex = i;
            }
        }

        yLists.splice(xIndex, 1);

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            xList.push(cols[xIndex]);
            for (let j = 0; j < cols.length; j++) {
                if (j < xIndex) {
                    yLists[j].push(cols[j]);
                }
                else if (j > xIndex) {
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
    }, [loading, experimentChartData, chartType, xAxis, isFullscreen]);

    const regenerateCanvas = () => {
        setCanvasKey(prevKey => prevKey + 1);
    };


    return (
        <Modal onClose={() => { onClose(); regenerateCanvas(); }}>
            <ModalContent>
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
            </ModalContent>
            <ChartContent toggleFullscreen={toggleFullscreen}>
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
            </ChartContent>
            <ModalContent>
                <div>
                    <p className="font-bold">X-Axis Column:</p>
                    <fieldset>
                        {headers.map((header) => (
                            <div key={header} className="p-1">
                                <input
                                    type="radio"
                                    id={header}
                                    onChange={() => setXAxis(header)}
                                    name="xaxis"
                                    value={header}

                                />
                                <label htmlFor={header} className="font-bold pl-2">{header}</label>
                            </div>
                        ))}
                    </fieldset>
                </div>
            </ModalContent>
            <button onClick={downloadImage} className='inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 xl:w-full'>
                Download Image
            </button>
        </Modal>
    );
};

export default ChartModal;