// src/components/TopBar.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faBell, faExpand, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

const TopBar = ({ onMenuToggle, title = 'Dashboard' }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [displayTitle, setDisplayTitle] = useState(title);

    // Atualiza o título quando a prop muda
    useEffect(() => {
        setDisplayTitle(title);
    }, [title]);

    return (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
            {/* Left: Menu Icon + Title */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={onMenuToggle}
                    className="text-gray-700 hover:text-clic-secondary transition"
                    aria-label="Toggle menu"
                >
                    <FontAwesomeIcon icon={faBars} size="lg" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">{displayTitle}</h1>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center space-x-6">
                {/* Fullscreen */}
                <button
                    onClick={() => {
                        if (!document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(err => {
                                console.error(`Erro ao entrar em fullscreen: ${err.message}`);
                            });
                        } else {
                            document.exitFullscreen();
                        }
                    }}
                    className="text-gray-600 hover:text-clic-secondary transition"
                    aria-label="Toggle fullscreen"
                >
                    <FontAwesomeIcon icon={faExpand} size="lg" />
                </button>

                {/* Notifications */}
                <button
                    className="relative text-gray-600 hover:text-clic-secondary transition"
                    aria-label="Notifications"
                >
                    <FontAwesomeIcon icon={faBell} size="lg" />
                    {/* Badge de notificação (opcional) */}
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Menu de Opções */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-600 hover:text-clic-secondary transition"
                        aria-label="More options"
                    >
                        <FontAwesomeIcon icon={faEllipsisVertical} size="lg" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
                                Perfil
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700">
                                Configurações
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 border-t">
                                Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
