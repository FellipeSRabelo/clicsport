// src/modules/vocacional/BoasVindas.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faListCheck } from '@fortawesome/free-solid-svg-icons';

// Recebe a função 'iniciarTeste' do Vocacional.jsx para mudar de tela
const BoasVindas = ({ iniciarTeste }) => {
    return (
        <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl border-t-8 border-clic-primary max-w-4xl mx-auto">
            
            <div className="flex items-center space-x-4 mb-6">
                <FontAwesomeIcon icon={faRocket} className="text-5xl text-clic-secondary" />
                <h2 className="text-3xl font-bold text-clic-secondary">
                    Bem-vindo(a) ao seu Guia Vocacional!
                </h2>  
            </div>
            
            <p className="text-lg text-gray-700 mb-6">
                Esta ferramenta foi desenvolvida para ajudar você, aluno(a) do Ensino Médio, a entender seus interesses mais profundos e mapeá-los para carreiras compatíveis com o seu perfil.
            </p>
            
            <div className="bg-clic-primary/20 p-5 rounded-lg mb-8 border border-clic-primary/50">
                <h3 className="text-xl font-semibold text-clic-secondary flex items-center">
                    <FontAwesomeIcon icon={faListCheck} className="mr-3 text-2xl" />
                    Como funciona o ClicVocacional?
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-800 mt-3 ml-4">
                    <li>Você responderá a **30 perguntas rápidas** (5 minutos).</li>
                    <li>O sistema irá calcular seu **Código Vocacional RIASEC** (as 3 letras mais fortes).</li>
                    <li>Você receberá um **Relatório Completo** com a descrição do seu perfil e 5 sugestões de carreira para explorar.</li>
                </ul>
            </div>
            
            <p className="text-lg text-red-600 font-semibold mb-6">
                Lembre-se: Seja 100% honesto(a) nas suas respostas! Não há certo ou errado.
            </p>

            <button 
                onClick={() => iniciarTeste('teste')}
                className="w-full px-8 py-4 bg-clic-secondary text-white font-bold text-xl rounded-xl shadow-lg hover:bg-gray-800 transition duration-300 transform hover:scale-[1.01]"
            >
                Iniciar Teste (30 Perguntas)
            </button>
        </div>
    );
};

export default BoasVindas;