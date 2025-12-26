// Contexto que gerencia a sessão do usuário e a ativação dos módulos
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { auth, db } from './firebaseConfig'; // A importação foi corrigida no ambiente de teste para ser './firebaseConfig'

// 1. Criação do Contexto
const AuthContext = createContext();

// Hook customizado para usar o contexto
export const useAuth = () => {
  return useContext(AuthContext);
};

// 2. Provedor de Contexto
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [escolaId, setEscolaId] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'gestor' ou 'aluno'
  const [modulosAtivos, setModulosAtivos] = useState({});
  const [modulosPermitidos, setModulosPermitidos] = useState({}); // Controle granular por gestor
  const [papelAchados, setPapelAchados] = useState(null); // 'responsavel' ou 'funcionario' dentro do Achados
  const [escolaNome, setEscolaNome] = useState('');
  const [escolaLoading, setEscolaLoading] = useState(false);

  // Lógica de Login do Gestor
  const loginGestor = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const gestorDocRef = doc(db, 'gestores', user.uid);
    const gestorDocSnap = await getDoc(gestorDocRef);

    if (!gestorDocSnap.exists()) {
      // Importante: Assuma que o gestor precisa ter o documento em /gestores para logar
      throw new Error("Usuário não é um gestor registrado.");
    }
    
    const gestorData = gestorDocSnap.data();
    setEscolaId(gestorData.escolaId);
    setUserRole('gestor');
    
    const escolaDocRef = doc(db, 'escolas', gestorData.escolaId);
    const escolaDocSnap = await getDoc(escolaDocRef);
    
    if (escolaDocSnap.exists()) {
      setModulosAtivos(escolaDocSnap.data().modulos_ativos || {});
    }

    return userCredential;
  };

  // Lógica de Login do Aluno (Mock para teste)
  const loginAluno = async (email, password) => {
    // Para simplificar o Auth, vamos usar email/senha por enquanto e forçar o role 'aluno'
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Na vida real, a matrícula geraria um token, mas aqui simulamos:
    const mockEscolaId = 'escola-teste'; // Será o ID da escola de teste criada no script de seed
    setEscolaId(mockEscolaId); 
    setUserRole('aluno');

    const escolaDocRef = doc(db, 'escolas', mockEscolaId);
    const escolaDocSnap = await getDoc(escolaDocRef);
    
    if (escolaDocSnap.exists()) {
      setModulosAtivos(escolaDocSnap.data().modulos_ativos || {});
    }

    return userCredential;
  };

  // Lógica de Login do Responsável (simplificada)
  const loginResponsavel = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Após o login, o onAuthStateChanged vai detectar e buscar os dados
    return userCredential;
  };

  // Login genérico com Google (gestor, professor ou responsável)
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userEmail = user.email;
    const userUid = user.uid;

    console.log('🔐 loginWithGoogle - UID:', userUid);

    try {
      // 1) Busca em gestores (collectionGroup - dentro de escolas/{escolaId}/gestores)
      console.log('🔍 Buscando em gestores collection...');
      try {
        const gestoresQuery = query(
          collectionGroup(db, 'gestores'),
          where('uid', '==', userUid)
        );
        const gestoresSnap = await getDocs(gestoresQuery);
        console.log('✅ Resultados gestores:', gestoresSnap.size);

        if (!gestoresSnap.empty) {
          console.log('🎉 GESTOR ENCONTRADO!');
          const gestorDoc = gestoresSnap.docs[0];
          const gestorData = gestorDoc.data();
          const escolaPath = gestorDoc.ref.parent.parent.path;
          const escolaIdFromPath = escolaPath.split('/')[1];

          console.log('✓ Escola ID extraído:', escolaIdFromPath);
          setEscolaId(escolaIdFromPath);
          setUserRole('gestor');

          // Carregar modulosPermitidos do documento do gestor
          if (gestorData.modulosPermitidos) {
            console.log('📋 Módulos permitidos:', gestorData.modulosPermitidos);
            setModulosPermitidos(gestorData.modulosPermitidos);
          }

          // Carregar papelAchados (responsavel ou funcionario)
          if (gestorData.papelAchados) {
            console.log('👤 Papel Achados:', gestorData.papelAchados);
            setPapelAchados(gestorData.papelAchados);
          }

          const escolaDocRef = doc(db, 'escolas', escolaIdFromPath);
          const escolaDocSnap = await getDoc(escolaDocRef);
          if (escolaDocSnap.exists()) {
            setModulosAtivos(escolaDocSnap.data().modulos_ativos || {});
          }
          return { found: true, role: 'gestor' };
        }
      } catch (gestorError) {
        console.log('❌ Erro ao buscar gestor:', gestorError.code, gestorError.message);
      }

      // 2) Busca em professores (collectionGroup por uid)
      console.log('🔍 Buscando em professores collection...');
      try {
        const professoresQuery = query(
          collectionGroup(db, 'professores'),
          where('uid', '==', userUid)
        );
        const professoresSnap = await getDocs(professoresQuery);
        console.log('✅ Resultados professores:', professoresSnap.size);

        if (!professoresSnap.empty) {
          console.log('🎉 PROFESSOR ENCONTRADO!');
          const professorDoc = professoresSnap.docs[0];
          const escolaPath = professorDoc.ref.parent.parent.path;
          const escolaIdFromPath = escolaPath.split('/')[1];

          setEscolaId(escolaIdFromPath);
          setUserRole('professor');

          const escolaDocRef = doc(db, 'escolas', escolaIdFromPath);
          const escolaDocSnap = await getDoc(escolaDocRef);
          if (escolaDocSnap.exists()) {
            setModulosAtivos(escolaDocSnap.data().modulos_ativos || {});
          }
          return { found: true, role: 'professor' };
        }
      } catch (profError) {
        console.log('❌ Erro ao buscar professor:', profError.code, profError.message);
      }

      // 3) Busca em responsáveis (collectionGroup por uid)
      console.log('🔍 Buscando em responsaveis collection...');
      try {
        const responsaveisQuery = query(
          collectionGroup(db, 'responsaveis'),
          where('uid', '==', userUid)
        );
        const responsaveisSnap = await getDocs(responsaveisQuery);
        console.log('✅ Resultados responsáveis:', responsaveisSnap.size);

        if (!responsaveisSnap.empty) {
          console.log('🎉 RESPONSÁVEL ENCONTRADO!');
          const responsavelDoc = responsaveisSnap.docs[0];
          const escolaPath = responsavelDoc.ref.parent.parent.path;
          const escolaIdFromPath = escolaPath.split('/')[1];

          setEscolaId(escolaIdFromPath);
          setUserRole('responsavel');

          const escolaDocRef = doc(db, 'escolas', escolaIdFromPath);
          const escolaDocSnap = await getDoc(escolaDocRef);
          if (escolaDocSnap.exists()) {
            setModulosAtivos(escolaDocSnap.data().modulos_ativos || {});
          }
          return { found: true, role: 'responsavel' };
        }
      } catch (respError) {
        console.log('❌ Erro ao buscar responsável:', respError.code, respError.message);
      }
    } catch (error) {
      console.error('❌ Erro geral durante busca de usuário:', error);
    }

    // 4) Não encontrado - usuário precisa se cadastrar
    console.log('⚠️ NENHUM REGISTRO ENCONTRADO - Redirecionando para cadastro');
    return { found: false, role: null, email: userEmail, uid: userUid };
  };


  useEffect(() => {
    console.log('AuthProvider: registrando listener onAuthStateChanged');
    
    // Timeout de segurança: se não carregar em 5 segundos, força o loading para false
    const timeoutId = setTimeout(() => {
      console.warn('AuthProvider: timeout de 5s excedido, forçando loading = false');
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthProvider: onAuthStateChanged ->', !!user, user ? user.uid : null);
      clearTimeout(timeoutId); // Cancela o timeout se responder a tempo
      setCurrentUser(user);

      try {
        if (user) {
          // Usa o loginWithGoogle para detectar role
          const result = await loginWithGoogle();
          console.log('AuthProvider: loginWithGoogle retornou ->', result);
        } else {
          setEscolaId(null);
          setUserRole(null);
          setModulosAtivos({});
        }
      } catch (err) {
        // Captura erros de permissão ou problemas de leitura do Firestore
        console.error('AuthProvider: erro ao carregar dados do Firestore no onAuthStateChanged:', err);
        // Em caso de erro de permissão, evita crash: limpa estados e segue
        setEscolaId(null);
        setUserRole(null);
        setModulosAtivos({});
      } finally {
        setLoading(false);
        console.log('AuthProvider: loading set to', false, 'currentUser:', user ? user.uid : null);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Listen for escola document changes and keep escolaNome + modulosAtivos in sync
  useEffect(() => {
    if (!escolaId) {
      setEscolaNome('');
      setEscolaLoading(false);
      return;
    }

    setEscolaLoading(true);
    const escolaRef = doc(db, 'escolas', escolaId);
    const unsub = onSnapshot(escolaRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setEscolaNome(data.nome || '');
        setModulosAtivos(data.modulos_ativos || {});
      } else {
        setEscolaNome('');
      }
      setEscolaLoading(false);
    }, (err) => {
      console.error('AuthProvider: erro onSnapshot escola', err);
      setEscolaNome('');
      setEscolaLoading(false);
    });

    return () => unsub();
  }, [escolaId]);

  const value = {
    currentUser,
    escolaId,
    userRole,
    modulosAtivos,
    modulosPermitidos,
    papelAchados,
    escolaNome,
    escolaLoading,
    loginGestor,
    loginAluno,
    loginResponsavel,
    loginWithGoogle,
    logout: () => signOut(auth),
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Carregando ClicSport...</h2>
            <p className="text-gray-600 text-sm">Inicializando autenticação com Firebase</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};