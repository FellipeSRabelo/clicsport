// src/utils/vocacionalCache.js
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

// O cache é uma variável no escopo do módulo, agindo como um "singleton" estático.
const vocacionalCache = {
    allQuestions: null, // Armazenará a lista completa de perguntas após o primeiro fetch.
};

// Constantes centralizadas para o teste vocacional.
export const RIASEC_TYPES = ['R', 'I', 'A', 'S', 'E', 'C'];
export const PERGUNTAS_POR_PERFIL = 5;

/**
 * Embaralha os elementos de um array usando o algoritmo Fisher-Yates.
 * @param {Array} array - O array a ser embaralhado.
 * @returns {Array} O mesmo array, com os elementos em ordem aleatória.
 */
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

/**
 * Busca as perguntas do Firestore (se ainda não estiverem em cache),
 * armazena-as e retorna uma nova lista de 30 perguntas sorteadas para o teste.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de 30 objetos de pergunta.
 */
export const getAndPrepareTestQuestions = async () => {
    // 1. VERIFICAR O CACHE
    if (!vocacionalCache.allQuestions) {
        console.log("Cache de perguntas vazio. Buscando do Firestore...");
        try {
            const querySnapshot = await getDocs(collection(db, 'perguntas_riasec'));
            const questions = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            if (questions.length < RIASEC_TYPES.length * PERGUNTAS_POR_PERFIL) {
                throw new Error("Não há perguntas suficientes no Firestore para montar o teste.");
            }

            vocacionalCache.allQuestions = questions; // Salva no cache para a próxima vez.
        } catch (err) {
            console.error("Erro crítico ao carregar perguntas do Firestore:", err);
            throw err; // Propaga o erro para o componente que chamou.
        }
    } else {
        console.log("Usando perguntas do cache em memória.");
    }

    // 2. SORTEAR AS PERGUNTAS PARA O TESTE ATUAL
    // Esta parte é executada sempre para que cada teste seja único.
    let sorted = [];
    const questionsByProfile = vocacionalCache.allQuestions.reduce((acc, q) => {
        if (!acc[q.perfil]) {
            acc[q.perfil] = [];
        }
        acc[q.perfil].push(q);
        return acc;
    }, {});

    RIASEC_TYPES.forEach(profile => {
        const profileQuestions = questionsByProfile[profile] || [];
        // Garante que estamos embaralhando uma cópia para não alterar o cache
        const shuffledProfileQuestions = shuffleArray([...profileQuestions]);
        const selected = shuffledProfileQuestions.slice(0, PERGUNTAS_POR_PERFIL);
        sorted.push(...selected);
    });

    // Embaralha a lista final de 30 perguntas
    return shuffleArray(sorted);
};