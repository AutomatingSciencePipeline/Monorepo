import React from 'react';
import ReactDOM from 'react-dom';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
    onClose?: () => void;
    fullScreen?: boolean;
    toggleFullscreen?: () => void;
    children: React.ReactNode;
}

const GraphModal: React.FC<ModalProps> = ({ onClose, fullScreen, toggleFullscreen, children }) => {
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-scroll">
            <div
                className={fullScreen ? "bg-white rounded-lg shadow-lg w-screen h-auto" : "bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3"}>
                <div className="flex justify-end p-2">
                    <button
                        onClick={toggleFullscreen}
                        className="flex items-center justify-center p-2 text-gray-500 transition duration-200 ease-in-out bg-gray-200 rounded-full shadow hover:bg-gray-300 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 mx-2"
                        aria-label="Toggle Fullscreen"
                    >
                        {fullScreen ?
                            (
                                <ArrowsPointingInIcon className="w-5 h-5" />
                            ) : (
                                <ArrowsPointingOutIcon className="w-5 h-5" />
                            )
                        }
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center p-2 text-gray-500 transition duration-200 ease-in-out bg-gray-200 rounded-full shadow hover:bg-gray-300 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GraphModal;