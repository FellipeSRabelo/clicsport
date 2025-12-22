// src/modules/gestao/Gestao.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../firebase/AuthContext'; // CORRIGIDO: Volta dois níveis
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faTools, faChalkboardTeacher, faUsers, faBook } from '@fortawesome/free-solid-svg-icons'; 
import GestaoTurmas from './GestaoTurmas'; 
import GestaoProfessores from './GestaoProfessores'; 
import GestaoAlunosTable from './GestaoAlunosTable'; 
import GestaoEscola from './GestaoEscola';


const Gestao = () => {
    const { userRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    // Inicia na tab 'alunos' (a que tem o upload)
    const initialTab = new URLSearchParams(location.search).get('tab') || 'alunos';
    const [activeTab, setActiveTab] = useState(initialTab); 

    useEffect(() => {
        const tab = new URLSearchParams(location.search).get('tab');
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    if (userRole !== 'gestor') {
        return <div className="p-8 bg-red-100 text-red-700 rounded-xl shadow">Acesso negado. Apenas gestores podem acessar este módulo.</div>;
    }

    // Definindo as abas disponíveis para o Gestor
    const tabs = [
        // CADASTROS CORE (Obrigatório)
        { id: 'alunos', name: 'Alunos e Importação', icon: faGraduationCap, component: GestaoAlunosTable }, 
        { id: 'turmas', name: 'Turmas', icon: faUsers, component: GestaoTurmas },
        { id: 'professores', name: 'Professores', icon: faChalkboardTeacher, component: GestaoProfessores },
        { id: 'config', name: 'Configurações', icon: faTools, component: GestaoEscola },

        // RELATÓRIOS/FERRAMENTAS (Módulos)
        
        // CONFIGURAÇÕES
    ].filter(Boolean); 

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || GestaoAlunosTable;

    return (
        <div className="min-h-full">
            
            {/* Navegação por Tabs */}
            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl shadow-md">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            navigate(`/gestao?tab=${tab.id}`, { replace: true });
                        }}
                        className={`flex-1 px-6 py-3 text-sm font-semibold whitespace-nowrap transition duration-200 flex items-center justify-center ${
                            activeTab === tab.id
                                ? 'border-b-4 border-clic-primary text-clic-secondary'
                                : 'text-gray-500 hover:text-clic-secondary/80'
                        }`}
                    >
                        <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Conteúdo da Tab Ativa */}
            <div className="bg-white p-6 rounded-b-xl shadow-md">
                <ActiveComponent />
            </div>
        </div>
    );
};

export default Gestao;