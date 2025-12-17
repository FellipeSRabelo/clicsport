// src/components/Modal.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const Modal = ({ children, title, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                
                {/* Header do Modal */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-clic-secondary">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-clic-secondary transition">
                        <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Conteúdo do Modal */}
                <div className="p-6">
                    {children}
                </div>

            </div>
        </div>
    );
};

export default Modal;