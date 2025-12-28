// src/components/TopBar.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faBell, faExpand, faHome, faUsers, faSearch, faBook, faTools, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext';

const TopBar = ({ onMenuToggle, title = 'Dashboard' }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [displayTitle, setDisplayTitle] = useState(title);
    const menuRef = useRef(null);
    const navigate = useNavigate();
    const { logout, modulosAtivos, modulosPermitidos, userRole, currentUser } = useSupabaseAuth();

    // Atualiza o título quando a prop muda
    useEffect(() => {
        setDisplayTitle(title);
    }, [title]);

    const appMenuItems = useMemo(() => {
        console.log('📋 modulosPermitidos:', modulosPermitidos);
        return [
            { name: 'Dashboard', path: '/app', icon: faHome, roles: ['gestor', 'aluno', 'responsavel'], key: 'dashboard' },
            { name: 'Gestão', path: '/gestao', icon: faUsers, roles: ['gestor'], key: 'gestao' },
            (modulosAtivos?.achados !== false) && { name: 'Achados', path: '/achados', icon: faSearch, roles: ['gestor', 'aluno', 'responsavel'], key: 'achados' },
            modulosAtivos?.pesquisas && { name: 'Pesquisas', path: userRole === 'responsavel' ? '/responsavel/pesquisas' : '/pesquisas', icon: faBook, roles: ['gestor', 'aluno', 'responsavel'], key: 'pesquisas' },
            { name: 'Escola', path: '/gestao?tab=config', icon: faTools, roles: ['gestor'], key: 'config' },
        ].filter(Boolean).filter(item => {
            // Se for gestor, verifica modulosPermitidos
            if (userRole === 'gestor' && item.key) {
                // Converte string "false" para booleano false
                const permitido = modulosPermitidos[item.key];
                const isPermitted = permitido === false || permitido === 'false' ? false : true;
                console.log(`✓ ${item.key}:`, permitido, '→', isPermitted);
                return item.roles.includes(userRole) && isPermitted;
            }
            return item.roles.includes(userRole || 'gestor');
        });
    }, [modulosAtivos, modulosPermitidos, userRole]);

    const handleConfiguracoes = () => {
        setShowMenu(false);
        navigate('/gestao?tab=config');
    };

    const handleLogout = async () => {
        setShowMenu(false);
        try {
            if (logout) await logout();
            navigate('/');
        } catch (err) {
            console.error('Erro ao sair:', err);
        }
    };

    // Fecha menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') setShowMenu(false);
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showMenu]);

    return (
        <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
            {/* Left: Menu Icon + Title */}
            <div className="flex items-center space-x-3">
                <button
                    onClick={onMenuToggle}
                    className="md:hidden text-gray-700 hover:text-clic-secondary transition bg-white p-1 h-7 w-7 flex items-center justify-center rounded focus:outline-none focus:ring-0"
                    aria-label="Toggle menu"
                >
                    <FontAwesomeIcon icon={faBars} size="sm" />
                </button>
                <h1 className="text-lg font-bold text-gray-800">{displayTitle}</h1>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center space-x-1.5">
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
                    className="text-gray-600 hover:text-clic-secondary transition bg-white p-1 h-7 w-7 flex items-center justify-center rounded focus:outline-none focus:ring-0"
                    aria-label="Toggle fullscreen"
                >
                    <FontAwesomeIcon icon={faExpand} size="sm" />
                </button>

                {/* Notifications */}
                <button
                    className="relative text-gray-600 hover:text-clic-secondary transition bg-white p-1 h-7 w-7 flex items-center justify-center rounded focus:outline-none focus:ring-0"
                    aria-label="Notifications"
                >
                    <FontAwesomeIcon icon={faBell} size="sm" />
                    {/* Badge de notificação (opcional) */}
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                </button>

                {/* Menu de Opções */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-600 hover:text-clic-secondary transition bg-white p-1 h-7 w-7 flex items-center justify-center rounded focus:outline-none focus:ring-0"
                        aria-label="More options"
                    >
                        <FontAwesomeIcon icon={faEllipsisVertical} size="sm" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-3">
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {appMenuItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => { setShowMenu(false); navigate(item.path); }}
                                        className="flex flex-col items-center justify-center rounded-md border border-gray-100 hover:border-clic-primary hover:bg-gray-50 p-2 text-gray-700 text-xs"
                                    >
                                        <FontAwesomeIcon icon={item.icon} className="mb-1" size="sm" />
                                        <span className="text-[11px] text-center leading-4">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="border-t pt-2">
                                {currentUser?.email && (
                                    <div className="px-2 py-1.5 text-xs text-gray-500 border-b mb-1">
                                        {currentUser.email}
                                    </div>
                                )}
                                {userRole === 'gestor' && (
                                  <button
                                      onClick={handleConfiguracoes}
                                      className="w-full text-left px-2 py-1.5 hover:bg-gray-100 text-gray-700 text-sm rounded"
                                  >
                                      Configurações da Escola
                                  </button>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-2 py-1.5 hover:bg-gray-100 text-gray-700 text-sm rounded"
                                >
                                    Sair
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
