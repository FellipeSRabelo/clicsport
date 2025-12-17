// src/modules/pesquisas/PublicPesquisa.jsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { resolveCampaignsRoot } from './campaignsPath';
import Toast from './components/Toast';

// Simple star input for 1-5 ratings
const StarRating = ({ value = 0, onChange }) => {
  return (
    <div className="flex gap-2" role="radiogroup">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`text-2xl leading-none ${score <= value ? 'text-yellow-400' : 'text-gray-300'}`}
          aria-label={`${score} estrelas`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const initialAccessState = {
  loading: false,
  error: null,
  success: false,
};

export default function PublicPesquisa() {
  const { escolaId, campaignId } = useParams();
  const navigate = useNavigate();

  const [accessState, setAccessState] = useState(initialAccessState);
  const [matricula, setMatricula] = useState('');
  const [aluno, setAluno] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [professores, setProfessores] = useState([]);
  const [answers, setAnswers] = useState({}); // { [profId]: { [qIndex]: value, comments?: string } }
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [toastError, setToastError] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Carrega campanha, turmas e professores (com fallback por nomes de professores salvos na turma)
  useEffect(() => {
    const loadCampaign = async () => {
      if (!escolaId || !campaignId) return;
      setGlobalError(null);
      try {
        const root = await resolveCampaignsRoot(db, escolaId);
        const campaignRef = doc(db, root, escolaId, 'campaigns', campaignId);
        const snap = await getDoc(campaignRef);
        if (!snap.exists()) {
          setGlobalError('Pesquisa não encontrada.');
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        setCampaign(data);

        const profIds = Array.isArray(data.targetProfessoresIds) ? data.targetProfessoresIds : [];
        let resolvedProfs = [];

        // 1) Tentar pelos IDs gravados na campanha
        if (profIds.length > 0) {
          const professorsPromises = profIds.map(async (profId) => {
            const ref = doc(db, 'escolas', escolaId, 'professores', profId);
            const profSnap = await getDoc(ref);
            if (!profSnap.exists()) return { id: profId, name: 'Professor(a)' };
            const profData = profSnap.data() || {};
            return { id: profId, name: profData.name || profData.nome || 'Professor(a)' };
          });
          resolvedProfs = await Promise.all(professorsPromises);
        }

        const turmaIds = Array.isArray(data.targetTurmasIds) ? data.targetTurmasIds : [];

        // 2) Fallback: derivar via turmas -> campo teachers (nomes) + cruzar com professores cadastrados (classes ou nome)
        if (resolvedProfs.length === 0 && turmaIds.length > 0) {
          const turmasQuery = query(collection(db, 'escolas', escolaId, 'turmas'));
          const turmasSnap = await getDocs(turmasQuery);
          const turmasMap = new Map();
          turmasSnap.docs.forEach((docSnap) => turmasMap.set(docSnap.id, docSnap.data()));

          const teacherNames = new Set();
          turmaIds.forEach((id) => {
            const turma = turmasMap.get(id);
            if (turma && Array.isArray(turma.teachers)) {
              turma.teachers
                .filter(Boolean)
                .map((n) => n.trim())
                .forEach((n) => teacherNames.add(n));
            }
          });

          // Cruzar com professores cadastrados que tenham classes (nomes) correspondentes
          const professoresRef = collection(db, 'escolas', escolaId, 'professores');
          const professoresSnap = await getDocs(professoresRef);
          const allProfs = professoresSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

          const turmaNames = new Set(
            turmaIds
              .map((id) => turmasMap.get(id))
              .filter(Boolean)
              .map((t) => (t.name || t.nome || '').trim().toLowerCase())
              .filter(Boolean)
          );

          const matchedByClass = allProfs.filter((prof) =>
            Array.isArray(prof.classes) && prof.classes.some((cls) => turmaNames.has(String(cls).trim().toLowerCase()))
          );

          const matchedByTeacherName = allProfs.filter((prof) => {
            const name = (prof.name || prof.nome || '').trim();
            return name && teacherNames.has(name);
          });

          const combined = [...matchedByClass, ...matchedByTeacherName];

          if (combined.length > 0) {
            resolvedProfs = combined.map((prof) => ({
              id: prof.id,
              name: prof.name || prof.nome || prof.id,
            }));
          } else if (teacherNames.size > 0) {
            // Se ainda não encontrou prof cadastrado, usa nomes da turma mesmo assim
            resolvedProfs = Array.from(teacherNames).map((name) => ({ id: name, name }));
          }
        }

        setProfessores(resolvedProfs);
      } catch (err) {
        console.error('[PublicPesquisa] erro ao carregar campanha:', err);
        setGlobalError('Erro ao carregar a pesquisa.');
      }
    };

    loadCampaign();
  }, [escolaId, campaignId]);

  const handleAccess = async (e) => {
    e.preventDefault();
    if (!matricula.trim()) return;
    setAccessState({ loading: true, error: null, success: false });
    setGlobalError(null);

    try {
      // TRAVA 0: Verificar se a pesquisa está aberta
      if (campaign && campaign.status !== 'active') {
        setAccessState({ loading: false, error: 'Esta pesquisa está fechada e não aceita mais respostas.', success: false });
        return;
      }

      const alunosRef = collection(db, 'escolas', escolaId, 'alunos');
      const q = query(alunosRef, where('matricula', '==', matricula.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setAccessState({ loading: false, error: 'Matrícula não encontrada. Verifique e tente novamente.', success: false });
        return;
      }

      const alunoDoc = snap.docs[0];
      const alunoData = alunoDoc.data();

      // TRAVA 1: Verificar se aluno está vinculado a uma turma
      const turmaNome = String(alunoData.nome_turma || alunoData.turma || '');
      if (!turmaNome || turmaNome.trim() === '') {
        setAccessState({ loading: false, error: 'Você não está vinculado a nenhuma turma. Contate a administração.', success: false });
        return;
      }

      // TRAVA 2: Verificar se aluno já respondeu esta pesquisa
      const root = await resolveCampaignsRoot(db, escolaId);
      const campaignRef = doc(db, root, escolaId, 'campaigns', campaignId);
      const responsesSnap = await getDocs(collection(campaignRef, 'responses'));
      
      const jaRespondeu = responsesSnap.docs.some((docSnap) => {
        const respData = docSnap.data();
        return respData.alunoId === alunoDoc.id;
      });

      if (jaRespondeu) {
        setAccessState({ loading: false, error: 'Você já respondeu esta pesquisa. Cada aluno pode responder apenas uma vez.', success: false });
        return;
      }

      setAluno({ id: alunoDoc.id, ...alunoData });
      setAccessState({ loading: false, error: null, success: true });
    } catch (err) {
      console.error('[PublicPesquisa] erro ao validar matrícula:', err);
      setAccessState({ loading: false, error: 'Erro ao validar matrícula.', success: false });
    }
  };

  const questions = useMemo(() => {
    if (!campaign?.questions) return [];
    return campaign.questions;
  }, [campaign]);

  const setAnswer = (profId, qIndex, value) => {
    setAnswers((prev) => ({
      ...prev,
      [profId]: {
        ...(prev[profId] || {}),
        [qIndex]: value,
      },
    }));
  };

  const setComment = (profId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [profId]: {
        ...(prev[profId] || {}),
        comment: value,
      },
    }));
  };

  const validateForm = () => {
    if (professores.length === 0) return true; // nothing to rate
    for (const prof of professores) {
      const profAnswers = answers[prof.id] || {};
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.type === 'scale5' && !profAnswers[i]) return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!aluno || !campaign) return;
    if (!validateForm()) {
      setToastError('Responda todas as perguntas de avaliação.');
      setShowToast(true);
      return;
    }

    setSubmitting(true);
    setGlobalError(null);

    try {
      const root = await resolveCampaignsRoot(db, escolaId);
      const campaignRef = doc(db, root, escolaId, 'campaigns', campaignId);

      const baseAluno = {
        alunoId: aluno.id,
        alunoNome: aluno.nome_aluno || aluno.nome || 'Aluno',
        alunoMatricula: aluno.matricula,
        turmaNome: aluno.nome_turma || aluno.turma || '-',
        ciclo: aluno.ciclo || null,
      };

      const payloads = professores.length > 0 ? professores : [{ id: 'na', name: 'Geral' }];

      await Promise.all(
        payloads.map((prof) => {
          const profAnswers = answers[prof.id] || {};
          const formatted = questions.map((_, idx) => profAnswers[idx] ?? '');
          const docData = {
            ...baseAluno,
            professorId: prof.id,
            professorNome: prof.name,
            answers: formatted,
            comment: profAnswers.comment || '',
            createdAt: serverTimestamp(),
            campaignId,
          };
          return addDoc(collection(campaignRef, 'responses'), docData);
        })
      );

      setSubmitDone(true);
    } catch (err) {
      console.error('[PublicPesquisa] erro ao salvar resposta:', err);
      setGlobalError('Não foi possível enviar suas respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitDone) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Obrigado!</h1>
          <p className="text-gray-600 mb-6">Suas respostas foram enviadas com sucesso.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Tela de acesso por matrícula
  if (!aluno) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">Acesso à Pesquisa</h1>
          <p className="text-center text-gray-600 mb-8 text-sm">
            Para iniciar a pesquisa, por favor, digite seu número de matrícula.
          </p>
          <form onSubmit={handleAccess} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Matrícula</label>
              <input
                type="text"
                inputMode="numeric"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {accessState.error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {accessState.error}
              </div>
            )}
            <button
              type="submit"
              disabled={accessState.loading || !matricula.trim()}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-60"
            >
              {accessState.loading ? 'Validando...' : 'Acessar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-1">Olá, {aluno.nome_aluno || aluno.nome || 'Aluno'}!</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{campaign?.title || 'Pesquisa'}</h1>
          <p className="text-gray-600 text-sm">Por favor, avalie conforme as perguntas abaixo.</p>
          {campaign?.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{campaign.description}</p>
            </div>
          )}
        </div>

        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {globalError}
          </div>
        )}

        <Toast
          isOpen={showToast}
          type="error"
          message={toastError}
          onClose={() => setShowToast(false)}
          duration={4000}
        />

        {professores.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-5 text-gray-600 text-sm">
            Nenhum professor vinculado a esta pesquisa.
          </div>
        ) : (
          professores.map((prof) => (
            <div key={prof.id} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-xl font-bold text-blue-700">{prof.name}</h2>
              {questions.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-sm font-semibold text-gray-800">{idx + 1}. {q.text}</p>
                  {q.type === 'scale5' ? (
                    <StarRating value={(answers[prof.id] || {})[idx] || 0} onChange={(val) => setAnswer(prof.id, idx, val)} />
                  ) : (
                    <textarea
                      rows={3}
                      value={(answers[prof.id] || {}).comment || ''}
                      onChange={(e) => setComment(prof.id, e.target.value)}
                      placeholder="Deixe seu comentário..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          ))
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || submitDone}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-60"
          >
            {submitting ? 'Enviando respostas...' : 'Enviar respostas'}
          </button>
        </div>
      </div>

      <Toast
        isOpen={showToast}
        type="error"
        message={toastError}
        onClose={() => setShowToast(false)}
        duration={4000}
      />
    </div>
  );
}
