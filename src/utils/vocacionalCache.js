// src/utils/vocacionalCache.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

let cachedQuestions = null;

/**
 * Busca as perguntas RIASEC do Firestore, utilizando um cache em memória
 * para evitar múltiplas leituras na mesma sessão.
 * @returns {Promise<Array>} Uma promessa que resolve para a lista de perguntas.
 */
export const getRiasecQuestions = async () => {
    if (cachedQuestions) {
        console.log("VocacionalCache: Retornando perguntas do cache.");
        return cachedQuestions;
    }

    try {
        console.log("VocacionalCache: Buscando perguntas do Firestore...");
        const querySnapshot = await getDocs(collection(db, 'perguntas_riasec'));
        const questions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        cachedQuestions = questions;
        console.log(`VocacionalCache: ${questions.length} perguntas armazenadas em cache.`);
        return cachedQuestions;
    } catch (error) {
        console.error("VocacionalCache: Erro ao buscar perguntas RIASEC:", error);
        return []; // Retorna array vazio em caso de erro para não quebrar a aplicação.
    }
};

/**
 * Embaralha um array de forma aleatória.
 * @param {Array} array O array a ser embaralhado.
 * @returns {Array} O array embaralhado.
 */
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};


/**
 * Seleciona um número específico de perguntas de cada área RIASEC.
 * Garante um teste balanceado.
 * @param {Array} allQuestions - Todas as perguntas disponíveis.
 * @param {number} questionsPerArea - Número de perguntas a selecionar por área.
 * @returns {Array} Uma lista de perguntas selecionadas e embaralhadas.
 */
export const selectBalancedQuestions = (allQuestions, questionsPerArea = 5) => {
    const areas = ['R', 'I', 'A', 'S', 'E', 'C'];
    let selectedQuestions = [];

    areas.forEach(area => {
        const questionsOfArea = allQuestions.filter(q => {
            const a = (q.area || q.perfil || q.categoria || q.tipo || '').toString().trim().toUpperCase();
            return a === area;
        });
        const shuffledAreaQuestions = shuffleArray(questionsOfArea);
        selectedQuestions.push(...shuffledAreaQuestions.slice(0, questionsPerArea));
    });

    // Embaralha o conjunto final para que as perguntas não apareçam em ordem de área
    return shuffleArray(selectedQuestions);
};
