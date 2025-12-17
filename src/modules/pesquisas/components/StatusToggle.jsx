import React from 'react';

export default function StatusToggle({ enabled, onChange, loading }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={`
        relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${enabled ? 'bg-blue-600' : 'bg-gray-300'}
        ${loading ? 'opacity-50 cursor-wait' : ''}
      `}
      title={enabled ? 'Desativar' : 'Ativar'}
    >
      <span
        aria-hidden="true"
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-lg 
          transition duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}