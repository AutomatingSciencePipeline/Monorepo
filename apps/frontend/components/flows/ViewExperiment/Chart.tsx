import React, { useState, useEffect } from 'react';
import { Chart, registerables, ChartTypeRegistry } from 'chart.js';
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
    const [experimentChartData, setExperimentChartData] = useState<string>('');

    const setLineChart = () => setChartType('line');
    const setBarChart = () => setChartType('bar');
    const setPieChart = () => setChartType('pie');

    useEffect(() => {
        const fetchData = async () => {
            try{
                const data = await getExperimentDataForGraph('A7RIXRMF4jSDz58W5zqm');
                //console.log(data);
                return data;

            } catch(error) {
                console.log("Error fetching data: " + error);
            }
        };

        const fetchDataAndSetState = async () => {
            const results = await fetchData();
            if (results !== undefined) {
                setExperimentChartData(results);
            }
        };

        fetchDataAndSetState();

    }, [project.expId]);

    console.log(experimentChartData)

    // const parseCSV = (data: string) => {
    //     const rows = data.trim().split('\n');
    //     const headers = rows[0].split(',');
    
    //     const xIndex = headers.indexOf('x');
    //     const yIndex = headers.indexOf('y');
    
    //     const xList: number[] = [];
    //     const yList: number[] = [];
    
    //     for (let i = 1; i < rows.length; i++) {
    //         const cols = rows[i].split(',');
    //         xList.push(Number(cols[xIndex]));
    //         yList.push(Number(cols[yIndex]));
    //     }
    
    //     return { xList, yList };
    // };
    
    // const { xList, yList } = parseCSV(csvData);
    
    // console.log('xList:', xList);
    // console.log('yList:', yList);


    useEffect(() => {
        const ctx = document.getElementById('myChart') as HTMLCanvasElement;
        if (chartInstance) {
            chartInstance.destroy();
        }
        const newChartInstance = new Chart(ctx, {
            type: chartType,
            data: {
                labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                datasets: [{
                    label: '# of Votes',
                    data: [12, 19, 3, 5, 2, 3],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        setChartInstance(newChartInstance);

        // Cleanup function to destroy the chart when the component unmounts or before creating a new chart
        return () => {
            if (newChartInstance) {
                newChartInstance.destroy();
            }
        };
    }, [canvasKey, chartType]);

    // Function to force re-render of the canvas
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
            </div>
            <div className='p-4'>
                <h2 className='text-xl font-bold mb-4'>{project.name}&apos;s Chart</h2>
                <div key={canvasKey}>
                    <canvas id='myChart'></canvas>
                </div>
            </div>
        </Modal>
    );
};

export default ChartModal;