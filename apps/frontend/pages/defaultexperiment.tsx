import React from 'react';
import {useRouter } from 'next/router';

const DefaultExperiment: React.FC = () => {

    const route = useRouter();


    const handleBack = () => {

        route.push("/dashboard");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md space-y-4">
                <h1 className="text-2xl font-bold text-center">Default Experiment</h1>
                <p className="text-gray-500 text-center">
                    This is a boilerplate component using Tailwind CSS.
                </p>
                <button type="button" 
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700"
                        onClick={handleBack}>
                    Click Me
                </button>
            </div>
        </div>
    );
};

export default DefaultExperiment;