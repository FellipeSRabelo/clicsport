import React from 'react';

export default function Modal({ isOpen, onClose, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00000090] bg-opacity-50 p-4">
      <div className={`bg-white rounded-sm shadow-xl w-full ${maxWidth} p-6 relative`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        {children}
      </div>
    </div>
  );
}
