// src/modules/gestao/GestaoEscola.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSupabaseAuth } from '../../supabase/SupabaseAuthContext';
import { db, storage } from '../../firebase/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUpload, faSchool } from '@fortawesome/free-solid-svg-icons';

const GestaoEscola = () => {
    const { user } = useSupabaseAuth();
    const escolaId = user?.escola_id; // Agora vem corretamente do contexto
    const [escola, setEscola] = useState({ nome: '', razao_social: '', cnpj: '', cep: '', endereco: '', cidade: '', uf: '', email: '', site: '', telefone: '', logoUrl: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [fallbackSaved, setFallbackSaved] = useState(false);
    const [logoRemoved, setLogoRemoved] = useState(false);
    const fileInputRef = useRef(null);

    // Carrega dados da escola
    useEffect(() => {
        if (!escolaId) return;
        const fetchEscola = async () => {
            setLoading(true);
            const escolaRef = doc(db, 'escolas', escolaId);
            const docSnap = await getDoc(escolaRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setEscola(data);
                setPreviewUrl(data.logoUrl || '');
            }
            setLoading(false);
        };
        fetchEscola();
    }, [escolaId]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // Simple phone formatter: (00) 0000-0000
    const formatPhone = (v) => {
        const d = (v || '').toString().replace(/\D/g, '').slice(0,10);
        if (d.length <= 2) return d;
        if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
        return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    };

    const handlePhoneChange = (e) => {
        const formatted = formatPhone(e.target.value);
        setEscola({ ...escola, telefone: formatted });
    };

    // CNPJ mask helpers: store digits only, display formatted
    const formatCNPJ = (v) => {
        const d = (v || '').toString().replace(/\D/g, '').slice(0,14);
        if (!d) return '';
        if (d.length <= 2) return d;
        if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
        if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
        if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
        return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
    };

    const handleCnpjChange = (e) => {
        const digits = (e.target.value || '').toString().replace(/\D/g, '').slice(0,14);
        setEscola({ ...escola, cnpj: digits });
    };

    // CEP mask helpers
    const formatCEP = (v) => {
        const d = (v || '').toString().replace(/\D/g, '').slice(0,8);
        if (!d) return '';
        if (d.length <= 5) return d;
        return `${d.slice(0,5)}-${d.slice(5)}`;
    };

    const handleCepChange = (e) => {
        const digits = (e.target.value || '').toString().replace(/\D/g, '').slice(0,8);
        setEscola({ ...escola, cep: digits });
    };

    // Helper: converte File para dataURL (Base64) — usado como fallback quando Storage nao funciona
    // Pode redimensionar e/ou cortar para dimensões exatas (targetWidth x targetHeight)
    const fileToDataUrl = (file, { maxWidth = 800, quality = 0.75, targetWidth, targetHeight } = {}) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // If target dimensions provided, perform cover resize then center-crop to exact target
                        if (targetWidth && targetHeight) {
                            const targetRatio = targetWidth / targetHeight;
                            const srcRatio = img.width / img.height;

                            let drawWidth = img.width;
                            let drawHeight = img.height;
                            // scale to cover
                            if (srcRatio > targetRatio) {
                                // source is wider -> scale by height
                                drawHeight = targetHeight;
                                drawWidth = Math.round(img.width * (targetHeight / img.height));
                            } else {
                                // source is taller or equal -> scale by width
                                drawWidth = targetWidth;
                                drawHeight = Math.round(img.height * (targetWidth / img.width));
                            }

                                // create temp canvas to draw scaled image
                                const tmp = document.createElement('canvas');
                                tmp.width = drawWidth;
                                tmp.height = drawHeight;
                                const tctx = tmp.getContext('2d');
                                tctx.drawImage(img, 0, 0, drawWidth, drawHeight);

                                // crop center to targetWidth x targetHeight
                                const sx = Math.max(0, Math.round((drawWidth - targetWidth) / 2));
                                const sy = Math.max(0, Math.round((drawHeight - targetHeight) / 2));

                                canvas.width = targetWidth;
                                canvas.height = targetHeight;
                                ctx.drawImage(tmp, sx, sy, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

                        } else {
                            // scale to maxWidth preserving aspect ratio
                            const scale = Math.min(1, maxWidth / img.width);
                            canvas.width = Math.round(img.width * scale);
                            canvas.height = Math.round(img.height * scale);
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        }

                        // Use PNG for exact target sizes (to preserve transparency), otherwise use JPEG
                        const dataUrl = (targetWidth && targetHeight)
                            ? canvas.toDataURL('image/png')
                            : canvas.toDataURL('image/jpeg', quality);
                        resolve(dataUrl);
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = () => reject(new Error('Erro ao carregar imagem para processamento'));
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // Convert dataURL to Blob (useful to upload to Storage)
    const dataURLToBlob = (dataurl) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!escolaId || !escola.nome) {
            alert('O nome da escola é obrigatório.');
            return;
        }
        // Basic validations
        const errors = [];
        // email basic check
        if (escola.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(escola.email)) {
            errors.push('E-mail inválido.');
        }
        // CNPJ must be 14 digits if provided
        if (escola.cnpj && escola.cnpj.replace(/\D/g, '').length !== 14) {
            errors.push('CNPJ deve conter 14 dígitos.');
        }
        // CEP 8 digits if provided
        if (escola.cep && escola.cep.replace(/\D/g, '').length !== 8) {
            errors.push('CEP deve conter 8 dígitos.');
        }
        if (errors.length) {
            alert('Corrija os seguintes erros:\n' + errors.join('\n'));
            return;
        }
        setSaving(true);
        try {
            console.log('GestaoEscola: iniciando save - escolaId=', escolaId, 'nome=', escola.nome, 'logoFile=', !!logoFile);
            let newLogoUrl = escola.logoUrl;
            let logoUpdated = false;

            if (logoFile) {
                const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

                if (isLocalhost) {
                    try {
                        console.log('GestaoEscola: localhost detected — using inline fallback (resized 300x150 PNG)');
                        const dataUrl = await fileToDataUrl(logoFile, { targetWidth: 300, targetHeight: 150 });
                        const approxBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
                        if (approxBytes <= 900000) {
                            newLogoUrl = dataUrl;
                            setFallbackSaved(true);
                            logoUpdated = true;
                        } else {
                            console.warn('GestaoEscola: compressed image too large (kb):', Math.round(approxBytes/1024));
                        }
                    } catch (convErr) {
                        console.error('GestaoEscola: error converting image to dataURL:', convErr);
                    }
                } else {
                    // Try upload to Firebase Storage, but first resize to desired proportion (300x150)
                    try {
                        console.log('GestaoEscola: attempting storage upload (resized 300x150)...');
                        // create resized dataURL at 300x150 and convert to Blob for upload
                        const resizedDataUrl = await fileToDataUrl(logoFile, { targetWidth: 300, targetHeight: 150 });
                        const blob = dataURLToBlob(resizedDataUrl);
                        // standardized filename (PNG, 300x150)
                        const filename = 'logo-300x150.png';
                        const storageRef = ref(storage, `escolas/${escolaId}/logo/${filename}`);
                        const uploadResult = await uploadBytes(storageRef, blob);
                        newLogoUrl = await getDownloadURL(uploadResult.ref);
                        logoUpdated = true;
                    } catch (uploadErr) {
                        console.error('GestaoEscola: upload failed, attempting inline fallback (300x150):', uploadErr);
                        try {
                            const dataUrl = await fileToDataUrl(logoFile, { targetWidth: 300, targetHeight: 150 });
                            const approxBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
                            if (approxBytes <= 900000) {
                                newLogoUrl = dataUrl;
                                setFallbackSaved(true);
                                logoUpdated = true;
                            } else {
                                console.warn('GestaoEscola: compressed image too large (kb):', Math.round(approxBytes/1024));
                            }
                        } catch (convErr) {
                            console.error('GestaoEscola: fallback conversion failed:', convErr);
                        }
                    }
                }
            }

            // Save Firestore document
            const escolaRef = doc(db, 'escolas', escolaId);
            console.log('GestaoEscola: saving document... logoUpdated=', logoUpdated, 'logoRemoved=', logoRemoved);
            const dataToSave = {
                ...escola,
                nome: escola.nome,
            };
            if (logoUpdated) {
                dataToSave.logoUrl = newLogoUrl;
            } else if (logoRemoved) {
                dataToSave.logoUrl = '';
            }
            await setDoc(escolaRef, dataToSave, { merge: true });
            console.log('GestaoEscola: setDoc complete.');

            // Update preview to final saved image (download URL or inline dataURL)
            if (logoUpdated) setPreviewUrl(newLogoUrl || '');
            if (logoRemoved) setPreviewUrl('');

            alert('Dados da escola salvos com sucesso!');
            setLogoFile(null);
        } catch (error) {
            console.error('Erro ao salvar dados da escola:', error);
            alert('Falha ao salvar. Verifique o console para mais detalhes.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>;
    }

    return (
        <div className="">
         <h2 className="text-left text-xl font-bold text-clic-secondary mb-4">Informações da Escola</h2>

            <form onSubmit={handleSave} className="">
                <div className="flex gap-4">
                    {/* Logo e Upload - Card Lateral */}
                    <div className="w-64 flex-shrink-0">
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2 text-center">Logo da Escola</p>
                            <div 
                                className="w-full h-32 bg-gray-100 mb-2 flex items-center justify-center border border-gray-300 rounded cursor-pointer hover:bg-gray-200 transition"
                                onClick={() => fileInputRef.current.click()}
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Logo da Escola" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <FontAwesomeIcon icon={faSchool} className="text-gray-400" size="2x" />
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/png, image/jpeg"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current.click()}
                                className="w-full px-2 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded shadow-sm hover:bg-gray-200 transition"
                            >
                                <FontAwesomeIcon icon={faUpload} className="mr-1" />
                                Trocar Logo
                            </button>
                            <p className="text-[10px] text-gray-500 mt-1.5 text-center">Recomendado: 300x150 PNG</p>
                            {fallbackSaved ? (
                                <p className="text-[10px] text-yellow-700 mt-1 text-center">Imagem salva.</p>
                            ) : null}
                        </div>
                    </div>

                    {/* Formulário - 3 Colunas */}
                    <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                        <label htmlFor="razao-social" className="block text-xs font-medium text-gray-700 mb-1">Razão Social</label>
                        <input
                            id="razao-social"
                            type="text"
                            value={escola.razao_social || ''}
                            onChange={(e) => setEscola({ ...escola, razao_social: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="Razão Social"
                        />
                    </div>

                    <div>
                        <label htmlFor="fantasia" className="block text-xs font-medium text-gray-700 mb-1">Nome Fantasia</label>
                        <input
                            id="fantasia"
                            type="text"
                            value={escola.nome || ''}
                            onChange={(e) => setEscola({ ...escola, nome: e.target.value })}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="Nome Fantasia"
                        />
                    </div>

                    <div>
                        <label htmlFor="cnpj" className="block text-xs font-medium text-gray-700 mb-1">CNPJ</label>
                        <input
                            id="cnpj"
                            type="text"
                            value={escola.cnpj ? formatCNPJ(escola.cnpj) : ''}
                            onChange={handleCnpjChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="00.000.000/0000-00"
                        />
                    </div>

                    <div>
                        <label htmlFor="cep" className="block text-xs font-medium text-gray-700 mb-1">CEP</label>
                        <input
                            id="cep"
                            type="text"
                            value={escola.cep ? formatCEP(escola.cep) : ''}
                            onChange={handleCepChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="00000-000"
                        />
                    </div>

                    <div>
                        <label htmlFor="endereco" className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
                        <input
                            id="endereco"
                            type="text"
                            value={escola.endereco || ''}
                            onChange={(e) => setEscola({ ...escola, endereco: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="Endereço"
                        />
                    </div>

                    <div>
                        <label htmlFor="cidade" className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                        <input
                            id="cidade"
                            type="text"
                            value={escola.cidade || ''}
                            onChange={(e) => setEscola({ ...escola, cidade: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="Cidade"
                        />
                    </div>

                    <div>
                        <label htmlFor="uf" className="block text-xs font-medium text-gray-700 mb-1">UF</label>
                        <input
                            id="uf"
                            type="text"
                            value={escola.uf || ''}
                            onChange={(e) => setEscola({ ...escola, uf: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="Estado (UF)"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            value={escola.email || ''}
                            onChange={(e) => setEscola({ ...escola, email: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="contato@escola.com.br"
                        />
                    </div>

                    <div>
                        <label htmlFor="site" className="block text-xs font-medium text-gray-700 mb-1">Site</label>
                        <input
                            id="site"
                            type="text"
                            value={escola.site || ''}
                            onChange={(e) => setEscola({ ...escola, site: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="https://www.escola.com.br"
                        />
                    </div>

                    <div>
                        <label htmlFor="telefone" className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                        <input
                            id="telefone"
                            type="text"
                            value={escola.telefone || ''}
                            onChange={handlePhoneChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-clic-primary focus:border-clic-primary"
                            placeholder="(00) 0000-0000"
                        />
                    </div>
                        </div>
                    </div>
                </div>

                {/* Botão de Salvar */}
                <div className="text-right pt-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-clic-secondary text-white text-sm font-bold rounded-lg shadow-md hover:bg-gray-800 transition disabled:bg-gray-400"
                    >
                        {saving ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> : null}
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GestaoEscola;
