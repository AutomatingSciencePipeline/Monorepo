import React, { useState, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import Modal from './Modal'; // Assuming you have a Modal component
import 'tailwindcss/tailwind.css';

Chart.register(...registerables);

interface ChartModalProps {
    onClose: () => void;
}

const ChartModal: React.FC<ChartModalProps> = ({ onClose }) => {
    const [chartInstance, setChartInstance] = useState<Chart | null>(null);
    const [canvasKey, setCanvasKey] = useState(0);

    useEffect(() => {
        const ctx = document.getElementById('myChart') as HTMLCanvasElement;
        if (chartInstance) {
            chartInstance.destroy();
        }
        const newChartInstance = new Chart(ctx, {
            type: 'line',
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
    }, [canvasKey]);

    // Function to force re-render of the canvas
    const regenerateCanvas = () => {
        setCanvasKey(prevKey => prevKey + 1);
    };

    return (
        <Modal onClose={() => { onClose(); regenerateCanvas(); }}>
            <div className='p-4'>
                <h2 className='text-xl font-bold mb-4'>Chart</h2>
                <div key={canvasKey}>
                    <canvas id='myChart'></canvas>
                </div>
            </div>
        </Modal>
    );
};

export default ChartModal;