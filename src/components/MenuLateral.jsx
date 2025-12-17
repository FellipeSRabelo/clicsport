// src/components/MenuLateral.jsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faUsers, faBook, faSearch, faBriefcase, faSignOutAlt, faChevronDown } from '@fortawesome/free-solid-svg-icons';

const MenuLateral = ({ isCompact = false }) => {
  const { userRole, modulosAtivos, logout, escolaId, escolaNome, escolaLoading } = useAuth();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const location = useLocation();
  
  // Define os itens do menu baseados no role e módulos ativos
  const menuItems = [
    { name: 'Dashboard', path: '/app', icon: faHome, roles: ['gestor', 'aluno'] },
    { name: 'Gestão Escolar', path: '/gestao', icon: faUsers, roles: ['gestor'] },
    
    // Módulos Ativos (Controlados pelo Firestore)
    modulosAtivos.vocacional && { name: 'Vocacional', path: '/vocacional', icon: faBriefcase, roles: ['gestor', 'aluno'] },
    modulosAtivos.achados && { name: 'Achados e Perdidos', path: '/achados', icon: faSearch, roles: ['gestor', 'aluno'] },
    modulosAtivos.pesquisas && { 
      name: 'Pesquisas', 
      icon: faBook, 
      roles: ['gestor', 'aluno'],
      submenu: [
        { name: 'Dashboard', path: '/pesquisas' },
        { name: 'Nova Campanha', path: '/pesquisas/nova-campanha' },
        { name: 'Minhas Pesquisas', path: '/pesquisas/lista' },
      ]
    },
    
  ].filter(item => item && item.roles.includes(userRole)); // Filtra pelos módulos ativos e permissão de role

  return (
    <div className={`flex flex-col h-full bg-clic-secondary text-white shadow-xl transition-all duration-300 ${
      isCompact ? 'w-20 p-2' : 'w-64 p-4'
    }`}>
      
      {/* Header do Menu */}
      {!isCompact && (
        <div className="text-center py-4 border-b border-gray-700">
          <div className="text-3xl font-extrabold text-clic-primary">ClicHub</div>
          <p className="text-[18px] font-bold mt-1 text-gray-300">{escolaLoading ? 'Carregando...' : (escolaNome || (escolaId === 'escola-teste' ? 'Teste' : escolaId))}</p>
        </div>
      )}

      {/* Navegação Principal */}
      <nav className={`flex-grow transition-all duration-300 ${
        isCompact ? 'mt-4 space-y-3' : 'mt-6 space-y-2'
      }`}>
        {menuItems.map((item) => {
          const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
          const isSubActive = hasSubmenu && item.submenu.some((sub) => location.pathname.startsWith(sub.path));
          const isExpanded = hasSubmenu && (expandedMenu === item.name || isSubActive);

          if (hasSubmenu) {
            return (
              <div key={item.path || item.name}>
                <button
                  onClick={() => setExpandedMenu(expandedMenu === item.name ? null : item.name)}
                  title={isCompact ? item.name : ''}
                  className={`flex items-center justify-between rounded-lg transition duration-200 w-full ${
                    isCompact ? 'p-3 justify-center' : 'p-3'
                  } bg-transparent focus:outline-none focus:ring-0 ${
                    isExpanded ? 'bg-clic-primary text-clic-primary font-bold' : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={item.icon} className={`w-5 h-5 ${
                      !isCompact ? 'mr-3' : ''
                    }`} />
                    {!isCompact && <span className="text-sm">{item.name}</span>}
                  </div>
                  {!isCompact && (
                    <FontAwesomeIcon 
                      icon={faChevronDown} 
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>

                {/* Submenu */}
                {!isCompact && isExpanded && (
                  <div className="ml-4 mt-2 space-y-1 border-l border-gray-600 pl-2">
                    {item.submenu.map((subitem) => (
                      <NavLink
                        key={subitem.path}
                        to={subitem.path}
                        end
                        className={({ isActive }) =>
                          `block text-sm p-2 rounded transition duration-200 ${
                            isActive ? 'bg-clic-primary text-clic-secondary font-bold' : 'hover:bg-gray-700 text-gray-300'
                          }`
                        }
                      >
                        {subitem.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={item.path || item.name}>
              <NavLink
                to={item.path}
                title={isCompact ? item.name : ''}
                className={({ isActive }) =>
                  `flex items-center rounded-lg transition duration-200 ${
                    isCompact ? 'p-3 justify-center' : 'p-3'
                  } ${
                    isActive ? 'bg-clic-primary text-clic-secondary font-bold' : 'hover:bg-gray-700 text-gray-300'
                  }`
                }
              >
                <FontAwesomeIcon icon={item.icon} className={`w-5 h-5 ${
                  !isCompact ? 'mr-3' : ''
                }`} />
                {!isCompact && <span className="text-sm">{item.name}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Botão de Logout */}
      <div className={`transition-all duration-300 ${
        isCompact ? 'pt-2' : 'pt-4'
      } border-t border-gray-700`}>
        <button
          onClick={logout}
          title="Sair"
          className={`flex items-center rounded-lg text-red-400 hover:bg-gray-700 transition duration-200 ${
            isCompact ? 'w-full p-3 justify-center' : 'w-full p-3'
          }`}
        >
          <FontAwesomeIcon icon={faSignOutAlt} className={`w-5 h-5 ${
            !isCompact ? 'mr-3' : ''
          }`} />
          {!isCompact && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default MenuLateral;