// src/modules/gestao/GestaoAlunosTable.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileImport, faTrash, faEdit, faSpinner } from '@fortawesome/free-solid-svg-icons';
import UploadAlunos from '../../components/UploadAlunos';
import Modal from '../../components/Modal';
import * as gestaoApi from '../../supabase/gestaoApi';

// Helper: sanitiza payload removendo campos vazios
const sanitizeAlunoPayload = (payload) => {
    const cleaned = {};
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            cleaned[key] = value;
        }
    });
    return cleaned;
};

// Helper: compara arrays
const arraysEqual = (a, b) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
};

// Componente Modal de Adição de Novo Aluno
const AddAlunoModal = ({ escolaId, unidades, modalidades, turmas, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nome_aluno: '',
        matricula: '',
        ano_turma: new Date().getFullYear().toString(),
        unidade: '',
        modalidade: '',
        turmas: [],
        dataNascimento: '',
        nomePai: '',
        celularPai: '',
        nomeMae: '',
        celularMae: '',
        responsavelNome: '',
        responsavelCPF: '',
        responsavelCEP: '',
        responsavelUF: '',
        responsavelEndereco: '',
        responsavelNumero: '',
        responsavelComplemento: '',
        responsavelBairro: '',
        responsavelCidade: '',
        responsavelEmail: '',
        responsavelTelefone: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (escolaId && !formData.matricula) {
            gestaoApi.gerarMatriculaAluno(escolaId)
                .then((mat) => {
                    if (mat) setFormData((prev) => ({ ...prev, matricula: mat }));
                })
                .catch((err) => console.error('Erro ao gerar matrícula:', err));
        }
    }, [escolaId, formData.matricula]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome_aluno.trim()) {
            alert('Nome do aluno é obrigatório.');
            return;
        }

        try {
            setSaving(true);
            
            // Cria o aluno com dados principais
            const payload = sanitizeAlunoPayload({
                nome_aluno: formData.nome_aluno,
                nome: formData.nome_aluno,
                matricula: formData.matricula,
                ano_turma: formData.ano_turma,
                data_nascimento: formData.dataNascimento || null,
                escola_id: escolaId,
            });
            
            const alunoNovo = await gestaoApi.createAluno(payload);

            // Salva dados de filiação (usando ID do aluno)
            await gestaoApi.upsertFiliacao(alunoNovo.id, {
                nome_pai: formData.nomePai || null,
                celular_pai: formData.celularPai || null,
                nome_mae: formData.nomeMae || null,
                celular_mae: formData.celularMae || null,
            });

            // Salva dados do responsável financeiro (usando ID do aluno)
            await gestaoApi.upsertResponsavelFinanceiro(alunoNovo.id, {
                nome: formData.responsavelNome || null,
                cpf: formData.responsavelCPF || null,
                cep: formData.responsavelCEP || null,
                uf: formData.responsavelUF || null,
                endereco: formData.responsavelEndereco || null,
                numero: formData.responsavelNumero || null,
                complemento: formData.responsavelComplemento || null,
                bairro: formData.responsavelBairro || null,
                cidade: formData.responsavelCidade || null,
                email: formData.responsavelEmail || null,
                telefone: formData.responsavelTelefone || null,
            });

            alert('Aluno adicionado com sucesso!');
            onSave();
            onClose();
        } catch (error) {
            console.error('Erro ao adicionar aluno:', error);
            alert('Erro ao adicionar aluno. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Adicionar Novo Aluno" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome e Matrícula */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nome do Aluno
                        </label>
                        <input
                            type="text"
                            value={formData.nome_aluno}
                            onChange={(e) => handleChange('nome_aluno', e.target.value)}
                            placeholder="Nome completo"
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Matrícula
                        </label>
                        <input
                            type="text"
                            value={formData.matricula}
                            onChange={(e) => handleChange('matricula', e.target.value)}
                            placeholder="Matrícula gerada automaticamente"
                            className="w-full text-sm border border-gray-300 rounded-md p-2 bg-gray-50 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            readOnly
                        />
                    </div>
                </div>

                {/* Ano, Unidade, Modalidade */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Ano
                        </label>
                        <input
                            type="text"
                            value={formData.ano_turma}
                            onChange={(e) => handleChange('ano_turma', e.target.value)}
                            placeholder="2024"
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unidade
                        </label>
                        <select
                            value={formData.unidade}
                            onChange={(e) => handleChange('unidade', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        >
                            <option value="">Selecione</option>
                            {unidades.map((unidade) => (
                                <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Modalidade
                        </label>
                        <select
                            value={formData.modalidade}
                            onChange={(e) => handleChange('modalidade', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        >
                            <option value="">Selecione</option>
                            {modalidades.map((modalidade) => (
                                <option key={modalidade.id} value={modalidade.id}>{modalidade.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Turmas */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Turmas (Ctrl/Cmd para múltiplas)
                    </label>
                    <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto">
                        <select
                            multiple
                            value={formData.turmas || []}
                            onChange={(e) => {
                                const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
                                handleChange('turmas', selectedOptions);
                            }}
                            className="w-full text-sm focus:outline-none"
                            size={5}
                        >
                            {
                                turmas
                                    .filter(
                                        (turma) =>
                                            (!formData.ano_turma || String(turma.ano) === formData.ano_turma) &&
                                            (!formData.unidade || turma.unidade_id === formData.unidade) &&
                                            (!formData.modalidade || turma.modalidade_id === formData.modalidade)
                                    )
                                    .filter((t) => !(formData.turmas || []).includes(t.nome))
                                    .map((turma) => {
                                        const diasTexto = Array.isArray(turma.dias_semana)
                                            ? turma.dias_semana.join(', ')
                                            : '';
                                        const horario = turma.hora_inicio && turma.hora_termino
                                            ? `${turma.hora_inicio} às ${turma.hora_termino}`
                                            : '';
                                        const label = [turma.nome, diasTexto, horario].filter(Boolean).join(' | ');
                                        return (
                                            <option key={turma.id} value={turma.nome}>{label}</option>
                                        );
                                    })
                            }
                        </select>
                    </div>
                </div>

                {/* Data de Nascimento */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Data de Nascimento
                    </label>
                    <input
                        type="date"
                        value={formData.dataNascimento}
                        onChange={(e) => handleChange('dataNascimento', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                    />
                </div>

                {/* Filiação - Pai */}
                <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Filiação</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome do Pai
                            </label>
                            <input
                                type="text"
                                value={formData.nomePai}
                                onChange={(e) => handleChange('nomePai', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Celular do Pai
                            </label>
                            <input
                                type="tel"
                                value={formData.celularPai}
                                onChange={(e) => handleChange('celularPai', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Filiação - Mãe */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nome da Mãe
                        </label>
                        <input
                            type="text"
                            value={formData.nomeMae}
                            onChange={(e) => handleChange('nomeMae', e.target.value)}
                            placeholder="Nome completo"
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Celular da Mãe
                        </label>
                        <input
                            type="tel"
                            value={formData.celularMae}
                            onChange={(e) => handleChange('celularMae', e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Responsável Financeiro */}
                <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Responsável Financeiro</h3>
                    
                    {/* Nome e CPF */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome Responsável
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNome}
                                onChange={(e) => handleChange('responsavelNome', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                CPF
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCPF}
                                onChange={(e) => handleChange('responsavelCPF', e.target.value)}
                                placeholder="000.000.000-00"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* CEP e UF */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                CEP
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCEP}
                                onChange={(e) => handleChange('responsavelCEP', e.target.value)}
                                placeholder="00000-000"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Estado (UF)
                            </label>
                            <select
                                value={formData.responsavelUF}
                                onChange={(e) => handleChange('responsavelUF', e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            >
                                <option value="">Selecione</option>
                                <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                                <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                                <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                                <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                                <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                                <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                                <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                                <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                                <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
                            </select>
                        </div>
                    </div>

                    {/* Endereço, Número, Complemento */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Endereço
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelEndereco}
                                onChange={(e) => handleChange('responsavelEndereco', e.target.value)}
                                placeholder="Rua, avenida, etc"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nº
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNumero}
                                onChange={(e) => handleChange('responsavelNumero', e.target.value)}
                                placeholder="123"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Complemento e Bairro */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Complemento
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelComplemento}
                                onChange={(e) => handleChange('responsavelComplemento', e.target.value)}
                                placeholder="Apto, sala, etc"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Bairro
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelBairro}
                                onChange={(e) => handleChange('responsavelBairro', e.target.value)}
                                placeholder="Nome do bairro"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Cidade, Email, Telefone */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cidade
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCidade}
                                onChange={(e) => handleChange('responsavelCidade', e.target.value)}
                                placeholder="Nome da cidade"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={formData.responsavelEmail}
                                onChange={(e) => handleChange('responsavelEmail', e.target.value)}
                                placeholder="email@exemplo.com"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Telefone
                            </label>
                            <input
                                type="tel"
                                value={formData.responsavelTelefone}
                                onChange={(e) => handleChange('responsavelTelefone', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-1 text-sm bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-1 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                        {saving ? 'Adicionando...' : 'Adicionar Aluno'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Componente Modal de Edição de Aluno
const EditAlunoModal = ({ aluno, escolaId, unidades, modalidades, turmas, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        nome_aluno: aluno.nome_aluno || '',
        matricula: aluno.matricula || '',
        ano_turma: aluno.ano_turma || '',
        unidade: aluno.unidade || '',
        modalidade: aluno.modalidade || '',
        nome_turma: aluno.nome_turma || '',
        turmas: aluno.turmas || (aluno.nome_turma ? [aluno.nome_turma] : []), // Migração automática
        dataNascimento: aluno.data_nascimento || aluno.dataNascimento || '',
        nomePai: aluno.nomePai || aluno.nome_pai || '',
        celularPai: aluno.celularPai || aluno.celular_pai || '',
        nomeMae: aluno.nomeMae || aluno.nome_mae || '',
        celularMae: aluno.celularMae || aluno.celular_mae || '',
        responsavelNome: aluno.responsavelNome || aluno.responsavel_nome || '',
        responsavelCPF: aluno.responsavelCPF || aluno.responsavel_cpf || '',
        responsavelCEP: aluno.responsavelCEP || aluno.responsavel_cep || '',
        responsavelUF: aluno.responsavelUF || aluno.responsavel_uf || '',
        responsavelEndereco: aluno.responsavelEndereco || aluno.responsavel_endereco || '',
        responsavelNumero: aluno.responsavelNumero || aluno.responsavel_numero || '',
        responsavelComplemento: aluno.responsavelComplemento || aluno.responsavel_complemento || '',
        responsavelBairro: aluno.responsavelBairro || aluno.responsavel_bairro || '',
        responsavelCidade: aluno.responsavelCidade || aluno.responsavel_cidade || '',
        responsavelEmail: aluno.responsavelEmail || aluno.responsavel_email || '',
        responsavelTelefone: aluno.responsavelTelefone || aluno.responsavel_telefone || '',
    });
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('dados');
    const [matriculas, setMatriculas] = useState([]);
    const [showNovaMatricula, setShowNovaMatricula] = useState(false);
    const [novaMatricula, setNovaMatricula] = useState({ ano: '', unidade: '', modalidade: '', turma: '' });
    const [novaMatriculaErro, setNovaMatriculaErro] = useState('');
    const [novaMatriculaLoading, setNovaMatriculaLoading] = useState(false);
    const [matriculaMutacaoId, setMatriculaMutacaoId] = useState(null);
    const [showAssinatura, setShowAssinatura] = useState(false);
    const [assinaturaSelecionada, setAssinaturaSelecionada] = useState(null);

    // Log para debugar dados do aluno
    useEffect(() => {
        console.log('EditAlunoModal - Aluno recebido:', aluno);
        console.log('Campos disponíveis:', Object.keys(aluno).sort());
        
        // Recarrega os dados do aluno para garantir que tem os responsáveis
        const carregarDadosCompletos = async () => {
            try {
                const alunoCompleto = await gestaoApi.fetchAlunoById(aluno.id);
                console.log('Aluno completo carregado:', alunoCompleto);
                console.log('Dados de responsáveis:', {
                    responsavel_nome: alunoCompleto.responsavel_nome,
                    responsavel_cpf: alunoCompleto.responsavel_cpf,
                    responsavel_email: alunoCompleto.responsavel_email,
                    responsavel_telefone: alunoCompleto.responsavel_telefone,
                });
                
                // Atualiza formData com todos os dados disponíveis
                const novoFormData = {
                    nome_aluno: alunoCompleto.nome_aluno || '',
                    matricula: alunoCompleto.matricula || '',
                    ano_turma: alunoCompleto.ano_turma || '',
                    unidade: alunoCompleto.unidade || '',
                    modalidade: alunoCompleto.modalidade || '',
                    nome_turma: alunoCompleto.nome_turma || '',
                    dataNascimento: alunoCompleto.data_nascimento || alunoCompleto.dataNascimento || '',
                    nomePai: alunoCompleto.nome_pai || alunoCompleto.nomePai || '',
                    celularPai: alunoCompleto.celular_pai || alunoCompleto.celularPai || '',
                    nomeMae: alunoCompleto.nome_mae || alunoCompleto.nomeMae || '',
                    celularMae: alunoCompleto.celular_mae || alunoCompleto.celularMae || '',
                    responsavelNome: alunoCompleto.responsavel_nome || '',
                    responsavelCPF: alunoCompleto.responsavel_cpf || '',
                    responsavelCEP: alunoCompleto.responsavel_cep || '',
                    responsavelUF: alunoCompleto.responsavel_uf || '',
                    responsavelEndereco: alunoCompleto.responsavel_endereco || '',
                    responsavelNumero: alunoCompleto.responsavel_numero || '',
                    responsavelComplemento: alunoCompleto.responsavel_complemento || '',
                    responsavelBairro: alunoCompleto.responsavel_bairro || '',
                    responsavelCidade: alunoCompleto.responsavel_cidade || '',
                    responsavelEmail: alunoCompleto.responsavel_email || '',
                    responsavelTelefone: alunoCompleto.responsavel_telefone || '',
                };
                console.log('Novo formData para responsáveis:', {
                    responsavelNome: novoFormData.responsavelNome,
                    responsavelCPF: novoFormData.responsavelCPF,
                    responsavelEmail: novoFormData.responsavelEmail,
                    responsavelTelefone: novoFormData.responsavelTelefone,
                });
                setFormData(novoFormData);
            } catch (error) {
                console.error('Erro ao carregar dados completos do aluno:', error);
            }
        };
        
        carregarDadosCompletos();
    }, [aluno.id]);

    const montarMatriculaInfo = useCallback(
        (turmaId) => {
            if (!turmaId) return null;
            const turma = turmas.find((t) => t.id === turmaId);
            if (!turma) return null;
            const unidade = unidades.find((u) => u.id === turma.unidade_id);
            const modalidade = modalidades.find((m) => m.id === turma.modalidade_id);
            return {
                turmaId: turma.id,
                ano: turma.ano,
                unidadeId: turma.unidade_id,
                unidadeNome: unidade?.nome || turma.unidade_id || '—',
                modalidadeId: turma.modalidade_id,
                modalidadeNome: modalidade?.nome || turma.modalidade_id || '—',
                turmaNome: turma.nome,
            };
        },
        [turmas, unidades, modalidades]
    );

    useEffect(() => {
        const info = (aluno.turma_ids || []).map((id) => montarMatriculaInfo(id)).filter(Boolean);
        setMatriculas(info);
    }, [aluno.turma_ids, montarMatriculaInfo]);

    const anosDisponiveis = useMemo(() => {
        const anosSet = new Set((turmas || []).map((turma) => String(turma.ano || '')));
        const values = Array.from(anosSet).filter(Boolean).sort();
        return values.length ? values : [String(new Date().getFullYear())];
    }, [turmas]);

    const modalidadesDisponiveis = useMemo(() => {
        if (!novaMatricula.unidade) return modalidades;
        return modalidades.filter((m) => m.unidade_id === novaMatricula.unidade);
    }, [modalidades, novaMatricula.unidade]);

    const turmasDisponiveis = useMemo(() => {
        return (turmas || []).filter((turma) => {
            const matchesAno = !novaMatricula.ano || String(turma.ano) === novaMatricula.ano;
            const matchesUnidade = !novaMatricula.unidade || turma.unidade_id === novaMatricula.unidade;
            const matchesModalidade = !novaMatricula.modalidade || turma.modalidade_id === novaMatricula.modalidade;
            const jaVinculado = matriculas.some((m) => m.turmaId === turma.id);
            return matchesAno && matchesUnidade && matchesModalidade && !jaVinculado;
        });
    }, [turmas, novaMatricula, matriculas]);

    useEffect(() => {
        const turmasNomes = matriculas.map((m) => m.turmaNome);
        const principal = matriculas[0];

        setFormData((prev) => {
            const alreadySynced =
                arraysEqual(prev.turmas || [], turmasNomes) &&
                (!principal ||
                    (prev.nome_turma === principal.turmaNome &&
                        prev.ano_turma === (principal.ano ? String(principal.ano) : '') &&
                        prev.unidade === principal.unidadeId &&
                        prev.modalidade === principal.modalidadeId));

            if (alreadySynced) return prev;

            const next = { ...prev, turmas: turmasNomes };
            if (principal) {
                next.nome_turma = principal.turmaNome;
                next.ano_turma = principal.ano ? String(principal.ano) : '';
                next.unidade = principal.unidadeId || '';
                next.modalidade = principal.modalidadeId || '';
            }
            return next;
        });
    }, [matriculas]);

    // Carrega assinaturas das matrículas do aluno
    useEffect(() => {
        const carregarAssinaturas = async () => {
            try {
                const assinaturas = await gestaoApi.fetchAssinaturasDoAluno(aluno.id);
                console.log('Assinaturas carregadas:', assinaturas);
                // Opcionalmente, você pode guardar isso em um estado se precisar
            } catch (error) {
                console.error('Erro ao carregar assinaturas:', error);
            }
        };
        carregarAssinaturas();
    }, [aluno.id]);

    const resetNovaMatricula = () => {
        setNovaMatricula({ ano: '', unidade: '', modalidade: '', turma: '' });
        setNovaMatriculaErro('');
    };

    const handleNovaMatriculaChange = (field, value) => {
        setNovaMatricula((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === 'unidade') {
                updated.modalidade = '';
                updated.turma = '';
            }
            if (field === 'modalidade' || field === 'ano') {
                updated.turma = '';
            }
            return updated;
        });
        setNovaMatriculaErro('');
    };

    const handleAdicionarMatricula = async () => {
        if (!novaMatricula.turma) {
            setNovaMatriculaErro('Selecione a turma que deseja vincular.');
            return;
        }

        const turmaSelecionada = turmas.find((t) => t.id === novaMatricula.turma);
        if (!turmaSelecionada) {
            setNovaMatriculaErro('Turma selecionada é inválida.');
            return;
        }

        try {
            setNovaMatriculaLoading(true);
            await gestaoApi.addAlunoToTurma(aluno.id, turmaSelecionada.id);
            const novaInfo = montarMatriculaInfo(turmaSelecionada.id);
            if (novaInfo) {
                setMatriculas((prev) => [...prev, novaInfo]);
            }
            resetNovaMatricula();
            setShowNovaMatricula(false);
        } catch (error) {
            console.error('Erro ao vincular turma:', error);
            setNovaMatriculaErro('Não foi possível vincular a turma. Tente novamente.');
        } finally {
            setNovaMatriculaLoading(false);
        }
    };

    const handleRemoverMatricula = async (turmaId) => {
        if (!window.confirm('Remover o vínculo desta turma?')) return;
        try {
            setMatriculaMutacaoId(turmaId);
            await gestaoApi.removeAlunoFromTurma(aluno.id, turmaId);
            setMatriculas((prev) => prev.filter((mat) => mat.turmaId !== turmaId));
        } catch (error) {
            console.error('Erro ao remover vínculo:', error);
            alert('Não foi possível remover o vínculo.');
        } finally {
            setMatriculaMutacaoId(null);
        }
    };

    // Anos letivos disponíveis
    const anosLetivos = [
        new Date().getFullYear() - 1,
        new Date().getFullYear(),
        new Date().getFullYear() + 1,
    ];

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nome_aluno || !formData.matricula) {
            alert('Nome e Matrícula são obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            // Atualiza dados principais do aluno
            const payload = sanitizeAlunoPayload({
                nome: formData.nome_aluno,
                nome_aluno: formData.nome_aluno,
                matricula: formData.matricula,
                data_nascimento: formData.dataNascimento || null,
                ano_turma: formData.ano_turma || null,
                nome_turma:
                    (formData.turmas && formData.turmas.length > 0)
                        ? formData.turmas[0]
                        : formData.nome_turma || null,
                turmas: formData.turmas || null,
            });

            await gestaoApi.updateAluno(aluno.id, payload);

            // Salva dados de filiação (usando ID do aluno, apesar do nome da coluna)
            await gestaoApi.upsertFiliacao(aluno.id, {
                nome_pai: formData.nomePai || null,
                celular_pai: formData.celularPai || null,
                nome_mae: formData.nomeMae || null,
                celular_mae: formData.celularMae || null,
            });

            // Salva dados do responsável financeiro (usando ID do aluno)
            await gestaoApi.upsertResponsavelFinanceiro(aluno.id, {
                nome: formData.responsavelNome || null,
                cpf: formData.responsavelCPF || null,
                cep: formData.responsavelCEP || null,
                uf: formData.responsavelUF || null,
                endereco: formData.responsavelEndereco || null,
                numero: formData.responsavelNumero || null,
                complemento: formData.responsavelComplemento || null,
                bairro: formData.responsavelBairro || null,
                cidade: formData.responsavelCidade || null,
                email: formData.responsavelEmail || null,
                telefone: formData.responsavelTelefone || null,
            });

            alert('Aluno atualizado com sucesso!');
            onSave();
        } catch (error) {
            console.error('Erro ao salvar aluno:', error);
            alert('Erro ao salvar aluno: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Editar Aluno" onClose={onClose} maxWidth="max-w-4xl">
            {/* Navegação por Abas */}
            <div className="flex gap-2 mb-4 border-b pb-2">
                {[
                    { id: 'dados', label: 'Dados do Aluno' },
                    { id: 'matricula', label: 'Matrícula' },
                    { id: 'responsaveis', label: 'Responsáveis' },
                    { id: 'financeiro', label: 'Financeiro' },
                    { id: 'assinatura', label: 'Assinatura' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Aba: Dados do Aluno */}
                {activeTab === 'dados' && (
                    <div className="space-y-3">
                        {/* Nome do Aluno */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome do Aluno<span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nome_aluno}
                                onChange={(e) => handleChange('nome_aluno', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Matrícula */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nº da Matrícula<span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.matricula}
                                disabled
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-gray-100 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">A matrícula não pode ser editada.</p>
                        </div>

                        {/* Data de Nascimento */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Data de Nascimento
                            </label>
                            <input
                                type="date"
                                value={formData.dataNascimento}
                                onChange={(e) => handleChange('dataNascimento', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                )}

                {/* Aba: Matrícula */}
                {activeTab === 'matricula' && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1 border-b pb-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Vínculos de Matrícula</p>
                                <p className="text-xs text-gray-500">Gerencie manualmente as turmas associadas a este aluno.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNovaMatricula((prev) => !prev);
                                    setNovaMatriculaErro('');
                                }}
                                className="self-start rounded-md border border-clic-primary px-3 py-1 text-xs font-semibold text-clic-primary transition hover:bg-clic-primary hover:text-white"
                            >
                                {showNovaMatricula ? 'Fechar' : 'Nova Matrícula'}
                            </button>
                        </div>

                        {showNovaMatricula && (
                            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                                {novaMatriculaErro && (
                                    <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                        {novaMatriculaErro}
                                    </div>
                                )}
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Ano</label>
                                        <select
                                            value={novaMatricula.ano}
                                            onChange={(e) => handleNovaMatriculaChange('ano', e.target.value)}
                                            className="w-full rounded-md border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                                        >
                                            <option value="">Todos</option>
                                            {anosDisponiveis.map((ano) => (
                                                <option key={ano} value={ano}>{ano}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Unidade</label>
                                        <select
                                            value={novaMatricula.unidade}
                                            onChange={(e) => handleNovaMatriculaChange('unidade', e.target.value)}
                                            className="w-full rounded-md border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                                        >
                                            <option value="">Todas</option>
                                            {unidades.map((unidade) => (
                                                <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Modalidade</label>
                                        <select
                                            value={novaMatricula.modalidade}
                                            onChange={(e) => handleNovaMatriculaChange('modalidade', e.target.value)}
                                            className="w-full rounded-md border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                                            disabled={!novaMatricula.unidade}
                                        >
                                            <option value="">{novaMatricula.unidade ? 'Todas' : 'Selecione uma unidade'}</option>
                                            {modalidadesDisponiveis.map((modalidade) => (
                                                <option key={modalidade.id} value={modalidade.id}>{modalidade.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Turma</label>
                                        <select
                                            value={novaMatricula.turma}
                                            onChange={(e) => handleNovaMatriculaChange('turma', e.target.value)}
                                            className="w-full rounded-md border border-gray-300 p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                                        >
                                            <option value="">Selecione...</option>
                                            {turmasDisponiveis.map((turma) => {
                                                const diasTexto = Array.isArray(turma.dias_semana)
                                                    ? turma.dias_semana.join(', ')
                                                    : '';
                                                const horario = turma.hora_inicio && turma.hora_termino
                                                    ? `${turma.hora_inicio} às ${turma.hora_termino}`
                                                    : '';
                                                const label = [turma.nome, diasTexto, horario].filter(Boolean).join(' | ');
                                                return (
                                                    <option key={turma.id} value={turma.id}>{label}</option>
                                                );
                                            })}
                                        </select>
                                        {!turmasDisponiveis.length && (
                                            <p className="mt-1 text-[11px] text-gray-500">Nenhuma turma disponível com os filtros selecionados.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetNovaMatricula();
                                            setShowNovaMatricula(false);
                                        }}
                                        className="rounded-md px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAdicionarMatricula}
                                        disabled={novaMatriculaLoading}
                                        className={`rounded-md px-3 py-1 text-xs font-semibold text-white ${
                                            novaMatriculaLoading ? 'bg-gray-400' : 'bg-clic-secondary hover:bg-gray-800'
                                        }`}
                                    >
                                        {novaMatriculaLoading ? 'Vinculando...' : 'Vincular'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="overflow-hidden rounded-lg border">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Ano</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Unidade</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Modalidade</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Turma</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Situação</th>
                                        <th className="px-3 py-2 text-right font-semibold text-gray-600">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {matriculas.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-3 py-4 text-center text-gray-500">Nenhuma matrícula vinculada.</td>
                                        </tr>
                                    ) : (
                                        matriculas.map((matricula) => (
                                            <tr key={matricula.turmaId}>
                                                <td className="px-3 py-2 text-gray-700">{matricula.ano || '—'}</td>
                                                <td className="px-3 py-2 text-gray-700">{matricula.unidadeNome}</td>
                                                <td className="px-3 py-2 text-gray-700">{matricula.modalidadeNome}</td>
                                                <td className="px-3 py-2 text-gray-900 font-medium">{matricula.turmaNome}</td>
                                                <td className="px-3 py-2 text-gray-600">Vinculada</td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoverMatricula(matricula.turmaId)}
                                                        disabled={matriculaMutacaoId === matricula.turmaId}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        {matriculaMutacaoId === matricula.turmaId ? 'Removendo...' : 'Remover'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* Aba: Responsáveis */}
                {activeTab === 'responsaveis' && (
                    <div className="space-y-3">
                {/* Filiação - Pai */}
                <div className="border-t pt-3 mt-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Filiação</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome do Pai
                            </label>
                            <input
                                type="text"
                                value={formData.nomePai}
                                onChange={(e) => handleChange('nomePai', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Celular do Pai
                            </label>
                            <input
                                type="tel"
                                value={formData.celularPai}
                                onChange={(e) => handleChange('celularPai', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Filiação - Mãe */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nome da Mãe
                        </label>
                        <input
                            type="text"
                            value={formData.nomeMae}
                            onChange={(e) => handleChange('nomeMae', e.target.value)}
                            placeholder="Nome completo"
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Celular da Mãe
                        </label>
                        <input
                            type="tel"
                            value={formData.celularMae}
                            onChange={(e) => handleChange('celularMae', e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                        />
                    </div>
                </div>

                        {/* Responsável Financeiro */}
                        <div className="border-t pt-3 mt-3 -mx-3 px-3 pb-3 bg-gray-50 rounded-b-lg">
                            <h3 className="text-xs font-semibold text-gray-700 mb-2">Responsável Financeiro</h3>
                    
                    {/* Nome e CPF */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nome Responsável
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNome}
                                onChange={(e) => handleChange('responsavelNome', e.target.value)}
                                placeholder="Nome completo"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                CPF
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCPF}
                                onChange={(e) => handleChange('responsavelCPF', e.target.value)}
                                placeholder="000.000.000-00"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* CEP e UF */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                CEP
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCEP}
                                onChange={(e) => handleChange('responsavelCEP', e.target.value)}
                                placeholder="00000-000"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Estado (UF)
                            </label>
                            <select
                                value={formData.responsavelUF}
                                onChange={(e) => handleChange('responsavelUF', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            >
                                <option value="">Selecione</option>
                                <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option>
                                <option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option>
                                <option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option>
                                <option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                                <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option>
                                <option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option>
                                <option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option>
                                <option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                                <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
                            </select>
                        </div>
                    </div>

                    {/* Endereço, Número, Complemento */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Endereço
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelEndereco}
                                onChange={(e) => handleChange('responsavelEndereco', e.target.value)}
                                placeholder="Rua, avenida, etc"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nº
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelNumero}
                                onChange={(e) => handleChange('responsavelNumero', e.target.value)}
                                placeholder="123"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Complemento e Bairro */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Complemento
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelComplemento}
                                onChange={(e) => handleChange('responsavelComplemento', e.target.value)}
                                placeholder="Apto, sala, etc"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Bairro
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelBairro}
                                onChange={(e) => handleChange('responsavelBairro', e.target.value)}
                                placeholder="Nome do bairro"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Cidade, Email, Telefone */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cidade
                            </label>
                            <input
                                type="text"
                                value={formData.responsavelCidade}
                                onChange={(e) => handleChange('responsavelCidade', e.target.value)}
                                placeholder="Nome da cidade"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={formData.responsavelEmail}
                                onChange={(e) => handleChange('responsavelEmail', e.target.value)}
                                placeholder="email@exemplo.com"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Telefone
                            </label>
                            <input
                                type="tel"
                                value={formData.responsavelTelefone}
                                onChange={(e) => handleChange('responsavelTelefone', e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-clic-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
                    </div>
                )}

                {/* Aba: Financeiro */}
                {activeTab === 'financeiro' && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                        <p className="text-xs text-gray-500">Seção em desenvolvimento</p>
                        <p className="text-xs text-gray-400 mt-1">Em breve: histórico de pagamentos e pendências financeiras</p>
                    </div>
                )}

                {/* Aba: Assinatura */}
                {activeTab === 'assinatura' && (
                    <div className="space-y-3">
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Assinaturas em Matrículas</h3>
                            <p className="text-xs text-gray-500 mb-3">Clique em "Ver" para visualizar a assinatura da matrícula</p>
                            <div className="space-y-2">
                                {matriculas && matriculas.length > 0 ? (
                                    matriculas.map((mat) => (
                                        <div key={mat.turmaId} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-gray-800">{mat.turmaNome}</p>
                                                <p className="text-xs text-gray-500">{mat.unidadeNome} - {mat.modalidadeNome}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        const assinaturas = await gestaoApi.fetchAssinaturasDoAluno(aluno.id);
                                                        const assinaturaDaTurma = assinaturas.find(a => a.numero_matricula);
                                                        if (assinaturaDaTurma && assinaturaDaTurma.assinatura_canvas) {
                                                            setAssinaturaSelecionada(assinaturaDaTurma);
                                                            setShowAssinatura(true);
                                                        } else {
                                                            alert('Nenhuma assinatura encontrada para esta matrícula');
                                                        }
                                                    } catch (error) {
                                                        console.error('Erro ao buscar assinatura:', error);
                                                        alert('Erro ao carregar assinatura');
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition"
                                            >
                                                Ver
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-500 text-center py-4">Nenhuma matrícula vinculada</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                    >
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </form>

            {/* Modal de Visualização da Assinatura */}
            {showAssinatura && assinaturaSelecionada && (
                <Modal 
                    title="Visualizar Assinatura" 
                    onClose={() => {
                        setShowAssinatura(false);
                        setAssinaturaSelecionada(null);
                    }} 
                    maxWidth="max-w-4xl"
                >
                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-600 mb-3">Matrícula: {assinaturaSelecionada.numero_matricula}</p>
                            {assinaturaSelecionada.assinatura_canvas ? (
                                <img 
                                    src={assinaturaSelecionada.assinatura_canvas} 
                                    alt="Assinatura" 
                                    className="w-full h-auto max-h-[70vh] border border-gray-300 rounded mx-auto object-contain"
                                />
                            ) : (
                                <p className="text-xs text-gray-500">Nenhuma assinatura disponível</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-3">
                            <button
                                onClick={() => {
                                    if (assinaturaSelecionada.assinatura_canvas) {
                                        const link = document.createElement('a');
                                        link.href = assinaturaSelecionada.assinatura_canvas;
                                        link.download = `assinatura_${assinaturaSelecionada.numero_matricula}.png`;
                                        link.click();
                                    }
                                }}
                                className="px-4 py-2 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition"
                            >
                                Baixar
                            </button>
                            <button
                                onClick={() => {
                                    setShowAssinatura(false);
                                    setAssinaturaSelecionada(null);
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-400 transition"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </Modal>
    );
};

// Componente Principal - Tabela de Gestão de Alunos
const GestaoAlunosTable = () => {
    const { escolaId, user } = useSupabaseAuth();
    const [alunos, setAlunos] = useState([]);
    const [turmas, setTurmas] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [modalidades, setModalidades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingAluno, setEditingAluno] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const carregarDados = useCallback(async () => {
        if (!escolaId) {
            console.warn('escolaId não disponível');
            return;
        }
        try {
            setLoading(true);
            console.log('Carregando dados para escolaId:', escolaId);
            const [alunosData, turmasData, unidadesData, modalidadesData] = await Promise.all([
                gestaoApi.getAlunos(escolaId),
                gestaoApi.getTurmas(escolaId),
                gestaoApi.getUnidades(escolaId),
                gestaoApi.getModalidades(escolaId),
            ]);
            console.log('Alunos carregados:', alunosData);
            console.log('Turmas carregadas:', turmasData);
            setAlunos(alunosData || []);
            setTurmas(turmasData || []);
            setUnidades(unidadesData || []);
            setModalidades(modalidadesData || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, [escolaId]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    const handleAddAluno = async () => {
        carregarDados();
        setShowAddModal(false);
    };

    const handleDeleteAluno = async (id) => {
        if (!window.confirm('Tem certeza que deseja deletar este aluno?')) return;
        try {
            await gestaoApi.deleteAluno(id);
            setAlunos((prev) => prev.filter((a) => a.id !== id));
        } catch (error) {
            console.error('Erro ao deletar aluno:', error);
            alert('Erro ao deletar aluno');
        }
    };

    const handleEditAluno = (aluno) => {
        setEditingAluno(aluno);
        setShowEditModal(true);
    };

    const handleSaveAluno = async () => {
        carregarDados();
        setShowEditModal(false);
        setEditingAluno(null);
    };

    if (!escolaId || !user) {
        return <div className="p-4 text-center text-gray-500">Carregando...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Gestão de Alunos</h2>
            </div>
            
            {/* Busca e Ações */}
            <div className="flex justify-between items-center gap-3">
                <div className="flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Buscar por nome ou matrícula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="space-x-2">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition"
                    >
                        <FontAwesomeIcon icon={faFileImport} className="mr-2" />
                        Importar Alunos
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition"
                    >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Novo Aluno
                    </button>
                </div>
            </div>

            {/* Tabela de Alunos */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500" />
                        <p className="mt-2 text-gray-600">Carregando alunos...</p>
                    </div>
                ) : alunos.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Nenhum aluno encontrado. Clique em "Novo Aluno" para adicionar.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Matrícula</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Nome</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Turmas</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alunos
                                .filter((aluno) => {
                                    if (!searchTerm.trim()) return true;
                                    const termo = searchTerm.toLowerCase();
                                    const nome = (aluno.nome_aluno || aluno.nome || '').toLowerCase();
                                    const matricula = (aluno.matricula || '').toLowerCase();
                                    return nome.includes(termo) || matricula.includes(termo);
                                })
                                .map((aluno) => (
                                <tr 
                                    key={aluno.id} 
                                    onClick={() => handleEditAluno(aluno)}
                                    className="border-b hover:bg-gray-50 transition cursor-pointer"
                                >
                                    <td className="px-4 py-2 text-gray-800">{aluno.matricula || '—'}</td>
                                    <td className="px-4 py-2 text-gray-800">{aluno.nome_aluno || '—'}</td>
                                    <td className="px-4 py-2 text-gray-600">
                                        {aluno.turma_ids && aluno.turma_ids.length > 0
                                            ? turmas
                                                  .filter((t) => aluno.turma_ids.includes(t.id))
                                                  .map((t) => t.nome)
                                                  .join(', ')
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-2 space-x-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditAluno(aluno);
                                            }}
                                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                                            title="Editar"
                                        >
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteAluno(aluno.id);
                                            }}
                                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                                            title="Deletar"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modais */}
            {showAddModal && (
                <AddAlunoModal
                    escolaId={escolaId}
                    unidades={unidades}
                    modalidades={modalidades}
                    turmas={turmas}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddAluno}
                />
            )}

            {showEditModal && editingAluno && (
                <EditAlunoModal
                    aluno={editingAluno}
                    escolaId={escolaId}
                    unidades={unidades}
                    modalidades={modalidades}
                    turmas={turmas}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleSaveAluno}
                />
            )}

            {showUploadModal && (
                <Modal title="Importar Alunos" onClose={() => setShowUploadModal(false)}>
                    <UploadAlunos escolaId={escolaId} onSuccess={carregarDados} onClose={() => setShowUploadModal(false)} />
                </Modal>
            )}
        </div>
    );
};

export default GestaoAlunosTable;
