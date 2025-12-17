import React, { useEffect } from 'react';

export default function Toast({ message, type = 'error', isOpen, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, duration]);

  if (!isOpen) return null;

  const bgColor = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600';
  const icon = type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`${bgColor} text-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3 animate-slide-in-right`}>
        <span className="text-xl">{icon}</span>
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:opacity-75 transition-opacity text-lg"
        >
          ✕
        </button>
      </div>
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
