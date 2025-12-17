// Este arquivo não é mais necessário - substituído por ModalAdicionarItem.jsx
// src/modules/achados/components/RegistrarItem.jsx
import React from 'react';

const RegistrarItem = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    local: '',
    categoria: 'Uniforme',
    nomeAluno: '',
    status: 'encontrado' // encontrado (na secretaria), perdido (comunicado de perda)
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categorias = [
    'Uniforme',
    'Material Escolar',
    'Eletrônico',
    'Garrafa/Lancheira',
    'Documentos',
    'Óculos',
    'Acessórios',
    'Outros'
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.titulo.trim()) {
      setError('O título do item é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(formData);
      alert('Item registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setError('Erro ao registrar item. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <button 
          onClick={onCancel} 
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Registrar Novo Item</h2>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Registro
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleChange('status', 'encontrado')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${formData.status === 'encontrado' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
              >
                <FontAwesomeIcon 
                  icon={faCheckCircle} 
                  className={`w-6 h-6 mx-auto mb-2 ${formData.status === 'encontrado' ? 'text-blue-600' : 'text-gray-400'}`} 
                />
                <span className="font-semibold block text-gray-900">Encontrado na Escola</span>
                <span className="text-xs text-gray-500 mt-1">Está na secretaria</span>
              </button>
              <button
                type="button"
                onClick={() => handleChange('status', 'perdido')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${formData.status === 'perdido' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}
              >
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className={`w-6 h-6 mx-auto mb-2 ${formData.status === 'perdido' ? 'text-red-600' : 'text-gray-400'}`} 
                />
                <span className="font-semibold block text-gray-900">Comunicado de Perda</span>
                <span className="text-xs text-gray-500 mt-1">Pais reportaram</span>
              </button>
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              O que é o item?<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ex: Casaco Azul Tam. M"
              value={formData.titulo}
              onChange={e => handleChange('titulo', e.target.value)}
            />
          </div>

          {/* Categoria e Nome do Aluno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria<span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                value={formData.categoria}
                onChange={e => handleChange('categoria', e.target.value)}
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Aluno (se houver)
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Nome na etiqueta"
                value={formData.nomeAluno}
                onChange={e => handleChange('nomeAluno', e.target.value)}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição Detalhada<span className="text-red-500">*</span>
            </label>
            <textarea
              rows="3"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Marca, detalhes, estado de conservação..."
              value={formData.descricao}
              onChange={e => handleChange('descricao', e.target.value)}
              required
            />
          </div>
          
          {/* Local */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Local (Encontrado ou Visto)<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ex: Pátio, Quadra, Sala 3B"
              value={formData.local}
              onChange={e => handleChange('local', e.target.value)}
              required
            />
          </div>

          {/* Botões */}
          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RegistrarItem;
