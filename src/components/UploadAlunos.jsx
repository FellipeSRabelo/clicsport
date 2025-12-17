// src/components/UploadAlunos.jsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx'; // Mantenha esta linha
import { db } from '../firebase/firebaseConfig'; // CORRIGIDO: Volta um nível
import { doc, setDoc, collection } from 'firebase/firestore'; // Adicionado collection
import { useAuth } from '../firebase/AuthContext'; // CORRIGIDO: Volta um nível
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faFileExcel, faCheckCircle, faExclamationCircle, faTimes, faDownload } from '@fortawesome/free-solid-svg-icons';

const UploadAlunos = () => {
    const { escolaId } = useAuth();
    const [file, setFile] = useState(null);
    const [data, setData] = useState(null);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setFile(file);
        
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            // Validação com os campos obrigatórios corretos
            const requiredHeaders = ['nome_aluno', 'matricula', 'ciclo', 'serie', 'nome_turma', 'ano_turma'];
            const fileHeaders = Object.keys(json[0] || {});
            
            const missingHeaders = requiredHeaders.filter(header => !fileHeaders.includes(header));

            if (missingHeaders.length === 0) {
                setData(json);
                setMessage(`Planilha "${file.name}" carregada. ${json.length} alunos prontos para importação.`);
                setSuccess(true);
            } else {
                setMessage(`Erro: Campos obrigatórios faltando: ${missingHeaders.join(', ')}.`);
                setSuccess(false);
                setData(null);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImport = async () => {
        if (!data || !escolaId) {
            setMessage('❌ Erro: Dados ou ID da escola não carregados.');
            setSuccess(false);
            return;
        }

        setLoading(true);
        setMessage('Iniciando importação...');
        setSuccess(null);
        let importedCount = 0;
        
        try {
            console.log('UploadAlunos: Iniciando importação para escolaId=', escolaId);
            console.log('UploadAlunos: Total de alunos a importar:', data.length);
            
            // Acessa a subcoleção de alunos da escola
            const alunosCollectionRef = collection(db, 'escolas', escolaId, 'alunos');
            console.log('UploadAlunos: Referência de coleção criada');

            for (const aluno of data) {
                // Usa a matrícula como o ID do documento
                const docId = aluno.matricula.toString().trim(); 
                
                console.log(`UploadAlunos: Salvando aluno ${importedCount + 1}/${data.length} - docId=${docId}`);
                
                try {
                    await setDoc(doc(alunosCollectionRef, docId), {
                        nome_aluno: aluno.nome_aluno || 'N/A',
                        matricula: docId,
                        ciclo: aluno.ciclo || 'N/A',
                        serie: aluno.serie || 'N/A',
                        nome_turma: aluno.nome_turma || 'N/A',
                        ano_turma: aluno.ano_turma || 'N/A',
                        dataImportacao: new Date().toISOString(),
                    });
                    importedCount++;
                    console.log(`UploadAlunos: Aluno ${docId} salvo com sucesso`);
                } catch (docError) {
                    console.error(`UploadAlunos: Erro ao salvar aluno ${docId}:`, docError.message);
                    throw new Error(`Erro ao salvar aluno ${docId}: ${docError.message}`);
                }
            }

            console.log('UploadAlunos: Importação concluída com sucesso!', importedCount, 'alunos');
            setMessage(`✅ Sucesso! ${importedCount} alunos importados para a escola.`);
            setSuccess(true);

        } catch (error) {
            console.error("UploadAlunos: Erro geral na importação:", error);
            console.error("UploadAlunos: Mensagem de erro:", error.message);
            console.error("UploadAlunos: Código de erro:", error.code);
            setMessage(`❌ Falha na importação: ${error.message || 'Verifique a conexão e as permissões de escrita.'}`);
            setSuccess(false);
        } finally {
            setLoading(false);
            setFile(null);
            setData(null);
        }
    };
    
    const handleClearFile = () => {
        setFile(null);
        setData(null);
        setMessage('');
        setSuccess(null);
    }

    const handleDownloadTemplate = () => {
        // Faz download do arquivo modelo da pasta public
        const link = document.createElement('a');
        link.href = '/modelo_alunos.xlsx';
        link.download = 'modelo_alunos.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Configuração de Estilo
    const statusClass = success === true ? 'bg-green-100 text-green-700' : success === false ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-600';

    return (
        <div className="max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Importação de Dados de Alunos</h2>
            
            {/* Modelo da Planilha */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                <p className="font-semibold mb-2">Estrutura do arquivo:</p>
                <p className="mb-3">O arquivo **.xlsx** deve ter as seguintes colunas (obrigatórias):</p>
                <div className="font-mono bg-blue-100 p-2 rounded mb-3 text-xs">
                    <p>• nome_aluno</p>
                    <p>• matricula</p>
                    <p>• ciclo</p>
                    <p>• serie</p>
                    <p>• nome_turma</p>
                    <p>• ano_turma</p>
                </div>
                <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Baixar Modelo (modelo_alunos.xlsx)</span>
                </button>
            </div>

            {/* Area de Upload */}
            <div className={`p-6 border-2 border-dashed ${success === true ? 'border-green-400' : success === false ? 'border-red-400' : 'border-gray-300'} rounded-xl transition duration-300 mb-6 flex flex-col items-center justify-center`}>
                
                {file ? (
                    <div className="text-center">
                        <div className="flex items-center space-x-3 mb-3">
                            <FontAwesomeIcon icon={faFileExcel} className="text-3xl text-clic-primary" />
                            <p className="text-lg font-semibold text-gray-800">{file.name}</p>
                            <button onClick={handleClearFile} className="text-gray-400 hover:text-red-500">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600">{data ? `${data.length} registros carregados.` : 'Erro de validação.'}</p>
                    </div>
                ) : (
                    <>
                        <FontAwesomeIcon icon={faCloudUploadAlt} className="text-4xl text-gray-400 mb-3" />
                        <label htmlFor="file-upload" className="cursor-pointer bg-clic-primary hover:bg-yellow-400 text-clic-secondary font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
                            Selecionar Planilha (.xlsx)
                        </label>
                        <input id="file-upload" type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
                    </>
                )}
            </div>
            
            {/* Mensagem e Botão de Importação */}
            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center space-x-3 ${statusClass}`}>
                    <FontAwesomeIcon 
                        icon={success ? faCheckCircle : faExclamationCircle} 
                        className={success ? 'text-green-500' : 'text-red-500'}
                    />
                    <p className="font-medium">{message}</p>
                </div>
            )}

            {data && success && (
                <button
                    onClick={handleImport}
                    disabled={loading}
                    className={`w-full py-3 text-white font-bold rounded-lg shadow-lg transition duration-300 ${
                        loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                    {loading ? 'Importando Alunos...' : `Confirmar Importação de ${data.length} Alunos`}
                </button>
            )}
        </div>
    );
};

export default UploadAlunos;