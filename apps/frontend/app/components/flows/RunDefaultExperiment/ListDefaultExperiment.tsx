import React from 'react';
import {useRouter } from 'next/router';
import ListItem from './ListItem';

const DefaultExperiment: React.FC = () => {

    const route = useRouter();

    const handleButtonClick = (title: string) => {
        console.log(`Button clicked for ${title}`);
    };

    const defaultExperimentInfo = [
        {
            title: "Add Nums",
            description: "test",
        },
        {
            title: "Add Nums 2",
            description: "test",
        },
        {
            title: "Add Nums 3",
            description: "test",
        },
        {
            title: "Add Nums 4",
            description: "test",
        },
    ];

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="default-experiment">
            {defaultExperimentInfo.map((item, index) => (
                <ListItem
                    key={index}
                    title={item.title}
                    description={item.description}
                    onButtonClick={() => handleButtonClick(item.title)}
                />
            ))}
        </div>
            
        </div>
    ); 
};

export default DefaultExperiment;