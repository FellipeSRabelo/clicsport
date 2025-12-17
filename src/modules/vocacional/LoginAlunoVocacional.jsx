// src/modules/vocacional/LoginAlunoVocacional.jsx
import React, { useState } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

const LoginAlunoVocacional = ({ escolaId, testeNome, onLogin }) => {
    const [matricula, setMatricula] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!matricula.trim()) {
            setError('Por favor, digite sua matrícula');
            return;
        }

        setLoading(true);

        try {
            // Buscar aluno pela matrícula na coleção de alunos da escola
            const alunosRef = collection(db, 'escolas', escolaId, 'alunos');
            const q = query(alunosRef, where('matricula', '==', matricula.trim()));
            const alunosSnap = await getDocs(q);

            if (alunosSnap.empty) {
                setError('Matrícula não encontrada. Verifique o número digitado.');
                setLoading(false);
                return;
            }

            // Recuperar dados do aluno (assuming there's only one match)
            const alunoDoc = alunosSnap.docs[0];
            const alunoData = alunoDoc.data();

            // Validações adicionais
            if (!alunoData.turma && !alunoData.nome_turma) {
                setError('Seu perfil não possui turma associada. Contate o administrador.');
                setLoading(false);
                return;
            }

            setSuccess(true);
            setMatricula('');

            // Chamar callback com dados do aluno após 1 segundo
            setTimeout(() => {
                onLogin({
                    id: alunoDoc.id,
                    matricula: matricula.trim(),
                    ...alunoData
                });
            }, 800);

        } catch (err) {
            console.error('Erro ao buscar aluno:', err);
            setError('Erro ao verificar sua matrícula: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 px-8 py-4 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Teste Vocacional</h1>
                <p className="text-blue-100 text-lg">{testeNome}</p>
            </div>

            {/* Content */}
            <div className="p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mr-3 mt-1 flex-shrink-0" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                            <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 mr-3 mt-1 flex-shrink-0" />
                            <p className="text-green-700 text-sm">Matrícula validada com sucesso! Carregando teste...</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="matricula" className="block text-sm font-medium text-gray-700 mb-3">
                         
                        </label>
                        <input
                            id="matricula"
                            type="text"
                            inputMode="numeric"
                            value={matricula}
                            onChange={(e) => setMatricula(e.target.value.replace(/\D/g, ''))}
                            placeholder="Número de Matrícula" style={{textAlign: 'left', fontSize: '16px', fontFamily: 'poppins, sans-serif'}}
                            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-2xl font-bold tracking-widest focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                            disabled={loading || success}
                            maxLength="20"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Seu número de matrícula está no seu crachá ou carteirinha escolar
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Como funciona:</h3>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Confirme sua matrícula</li>
                            <li>Responda com sinceridade a todas as perguntas</li>
                            <li>Você terá acesso ao seu resultado imediatamente</li>
                        </ol>
                    </div>

                    {/* Button */}
                    <button
                        type="submit"
                        disabled={loading || success || !matricula.trim()}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center"
                    >
                        {loading && <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />}
                        {loading ? 'Validando matrícula...' : success ? 'Acessando teste...' : 'Entrar no Teste'}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        ⏱️ Tempo estimado: 10-15 minutos
                    </p>
                    <p className="text-xs text-gray-500 text-center mt-2">
                        Não feche o navegador durante o teste
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginAlunoVocacional;
