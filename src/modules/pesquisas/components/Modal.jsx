import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

export default function Modal({ isOpen, onClose, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00000090] bg-opacity-50 p-4">
      <div className={`bg-white rounded-sm shadow-xl w-full ${maxWidth} p-6 relative`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-clic-secondary transition">
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}