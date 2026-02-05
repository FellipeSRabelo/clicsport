// src/components/MenuLateral.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../supabase/SupabaseAuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faUsers, faBook, faSearch, faSignOutAlt, faChevronDown, faCog, faBuilding, faGraduationCap, faChalkboardUser, faPerson, faMoneyBill, faDumbbell, faCalendar, faTicket, faFileAlt } from '@fortawesome/free-solid-svg-icons';

const MenuLateral = ({ isCompact = false }) => {
  const { userRole, modulosAtivos, modulosPermitidos, logout, escolaId, escolaNome, escolaLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState([]);
  const location = useLocation();
  
  // Define os itens do menu baseados no role e módulos ativos
  const menuItems = [
    { name: 'Dashboard', path: '/app', icon: faHome, roles: ['gestor', 'aluno', 'responsavel'], key: 'dashboard' },
    {
      name: 'Gestão Escolar',
      icon: faUsers,
      roles: ['gestor'],
      key: 'gestao',
      submenu: [
        { name: 'Configurações', path: '/gestao/configuracoes' },
        { name: 'Unidades', path: '/gestao/unidades' },
        { name: 'Modalidades', path: '/gestao/modalidades' },
        { name: 'Turmas', path: '/gestao/turmas' },
        { name: 'Professores', path: '/gestao/professores' },
        { name: 'Alunos', path: '/gestao' },
        { name: 'Matrículas', path: '/gestao' },
      ]
    },
    {
      name: 'Financeiro',
      icon: faMoneyBill,
      roles: ['gestor'],
      key: 'financeiro',
      submenu: [
        { name: 'Mensalidades', path: '/financeiro/mensalidades' },
      ]
    },
    (modulosAtivos.achados !== false) && { name: 'Achados e Perdidos', path: '/achados', icon: faSearch, roles: ['gestor', 'aluno', 'responsavel'], key: 'achados' },
    modulosAtivos.pesquisas && {
      name: 'Pesquisas e NPS',
      icon: faBook,
      roles: ['gestor', 'aluno', 'responsavel'],
      key: 'pesquisas',
      submenu: (
        userRole === 'responsavel'
          ? [
              { name: 'Disponíveis', path: '/responsavel/pesquisas' },
            ]
          : [
              { name: 'Nova Pesquisa', path: '/pesquisas/nova-campanha' },
              { name: 'Minhas Pesquisas', path: '/pesquisas/lista' },
            ]
      )
    },
    { name: 'Aula Experimental', path: '/aula-experimental', icon: faDumbbell, roles: ['gestor', 'aluno', 'responsavel'], key: 'aula-experimental' },
    {
      name: 'Eventos',
      icon: faCalendar,
      roles: ['gestor'],
      key: 'eventos',
      submenu: [
        { name: 'Novo Evento', path: '/eventos/novo' },
        { name: 'Meus Eventos', path: '/eventos/meus' },
        { name: 'Ingressos', path: '/eventos/ingressos' },
      ]
    },
    { name: 'Relatórios', path: '/relatorios', icon: faFileAlt, roles: ['gestor'], key: 'relatorios' },
  ].filter(item => {
    if (!item || !item.roles.includes(userRole)) return false;
    
    // Se for gestor, verifica modulosPermitidos
    if (userRole === 'gestor' && item.key) {
      return modulosPermitidos[item.key] !== false;
    }
    return true;
  });

  return (
    <div className={`flex flex-col h-full bg-zinc-600 text-white shadow-xl transition-all duration-300 ${
      isCompact ? 'w-16 p-2' : 'w-52 p-3'
    }`}>
      
      {/* Header do Menu */}
      {!isCompact && (
        <div className="text-center py-3">
          <p className="text-2xl font-black mt-1 text-white">{escolaLoading ? 'Carregando...' : (escolaNome || (escolaId === 'escola-teste' ? 'Teste' : escolaId))}</p>
        </div>
      )}

      {/* Navegação Principal */}
      <nav className={`flex-grow transition-all duration-300 ${
        isCompact ? 'mt-3 space-y-2' : 'mt-4 space-y-1.5'
      }`}>
        {menuItems.map((item) => {
          const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
          const isSubActive = hasSubmenu && item.submenu.some((sub) => location.pathname.startsWith(sub.path));
          const isExpanded = hasSubmenu && (expandedMenus.includes(item.name) || isSubActive);

          if (hasSubmenu) {
            return (
              <div key={item.path || item.name}>
                <div className="flex items-center w-full">
                  <button
                    onClick={() => {
                      if (!expandedMenus.includes(item.name)) {
                        setExpandedMenus([...expandedMenus, item.name]);
                      }
                      if (item.key === 'pesquisas') {
                        navigate('/pesquisas');
                      }
                    }}
                    title={isCompact ? item.name : ''}
                    className={`flex items-center flex-1 ${isCompact ? 'justify-center' : ''} rounded-lg transition duration-200 w-full ${
                      isCompact ? 'p-2' : 'p-2'
                    } bg-transparent focus:outline-none focus:ring-0 ${
                      isExpanded ? 'bg-purple-600 text-clic-primary font-bold' : 'hover:bg-zinc-700 text-zinc-50'
                    }`}
                  >
                    <span className={`flex items-center ${isCompact ? 'justify-center w-full' : ''}`}>
                      <FontAwesomeIcon icon={item.icon} className={`w-4 h-4 ${!isCompact ? 'mr-2' : ''}`} />
                      {!isCompact && <span className="text-xs">{item.name}</span>}
                    </span>
                  </button>
                  {!isCompact && (
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedMenus(expandedMenus.filter(name => name !== item.name));
                        } else {
                          setExpandedMenus([...expandedMenus, item.name]);
                        }
                      }}
                      className="ml-1 p-1 bg-transparent focus:outline-none"
                      tabIndex={-1}
                    >
                      <FontAwesomeIcon 
                        icon={faChevronDown} 
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>

                {/* Submenu */}
                {!isCompact && isExpanded && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-gray-600 pl-2">
                    {item.submenu.map((subitem) => (
                      <NavLink
                        key={subitem.path}
                        to={subitem.path}
                        end
                        className={({ isActive }) =>
                          `block text-xs p-1.5 rounded transition duration-200 ${
                            isActive ? 'bg-clic-primary text-clic-secondary font-bold' : 'hover:bg-zinc-700 text-zinc-50'
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
                    isCompact ? 'p-2 justify-center' : 'p-2'
                  } ${
                    isActive ? 'bg-clic-primary text-clic-secondary font-bold' : 'hover:bg-zinc-700 text-zinc-50'
                  }`
                }
              >
                <FontAwesomeIcon icon={item.icon} className={`w-4 h-4 ${
                  !isCompact ? 'mr-2' : ''
                }`} />
                {!isCompact && <span className="text-xs">{item.name}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Botão de Logout 
      <div className={`transition-all duration-300 ${
        isCompact ? 'pt-2' : 'pt-3'
      } border-t border-gray-700`}>
        <button
          onClick={logout}
          title="Sair"
          className={`flex items-center rounded-lg text-red-400 hover:bg-zinc-700 transition duration-200 ${
            isCompact ? 'w-full p-2 justify-center' : 'w-full p-2'
          }`}
        >
          <FontAwesomeIcon icon={faSignOutAlt} className={`w-4 h-4 ${
            !isCompact ? 'mr-2' : ''
          }`} />
          {!isCompact && <span className="text-xs">Sair</span>}
        </button>
      </div>*/}
    </div>
  );
};

export default MenuLateral;