import React, { useState } from 'react';

interface LinkDispatchProps {
    fileLink: string;
    isDefault: boolean;
}

const LinkDispatch: React.FC<LinkDispatchProps> = ({ fileLink, isDefault }) => {
    const [link, setLink] = useState(isDefault ? fileLink : '');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLink(event.target.value);
    };

    return (
        <div className='flex flex-col space-y-2 mx-4'>
            <label htmlFor="linkInput" className='block text-sm font-medium text-gray-700'>Insert Link:</label>
            <input
                type="text"
                id="linkInput"
                value={link}
                onChange={handleChange}
                placeholder="Enter your link here"
                className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
            />
        </div>
    );
};

export default LinkDispatch;