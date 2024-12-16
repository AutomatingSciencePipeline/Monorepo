import React, { useState } from 'react';
import { InputSection } from '../../InputSection';
import ReactDOM from 'react-dom';

interface ModalProps {
    onClose?: () => void;
    children: React.ReactNode;
}

const GraphModal: React.FC<ModalProps> = ({onClose, children}) => {

    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`bg-white rounded-lg shadow-lg ${isFullscreen ? 'w-full h-full' : 'w-11/12 md:w-1/2 lg:w-1/3'}`}>
                <div className="flex justify-end p-2">
                    <button
                        onClick={toggleFullscreen}
                        className="text-gray-500 hover:text-gray-700 mx-2">
                        {isFullscreen ? '⤡' : '⤢'}
                    </button>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        &times;
                    </button>
                </div>
                <div className={`p-4 ${isFullscreen ? 'overflow-y-auto max-h-screen' : ''}`}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GraphModal;