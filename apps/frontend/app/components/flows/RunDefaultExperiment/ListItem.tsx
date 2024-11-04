import React from 'react';

interface ListItemProps {
    title: string;
    description: string;
    onButtonClick: () => void;
}

const ListItem: React.FC<ListItemProps> = ({ title, description, onButtonClick }) => {
    return (
        <div className="list-item w-full p-4 border-b border-gray-200">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-gray-700">{description}</p>
            <div className="flex justify-center mt-4">
                <button 
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700"
                    onClick={onButtonClick}
                >
                    Run {title}
                </button>
            </div>
        </div>
    );
};

export default ListItem;