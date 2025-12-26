// src/modules/matricula/ModalMatriculaInfo.jsx
import React from 'react';
import { X } from 'lucide-react';

const ModalMatriculaInfo = ({ onContinue, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        >
          <X size={24} />
        </button>

        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          MATRÍCULA: PASSO A PASSO
        </h1>

        <div className="space-y-4 text-sm text-gray-800">
          <section>
            <h3 className="font-bold mb-2">Preenchimento do Cadastro:</h3>
            <p>
              É essencial preencher completamente o cadastro disponível. Certifique-se de fornecer
              todas as informações necessárias e selecione a unidade desejada e a turma correspondente
              durante o processo de inscrição.
            </p>
          </section>

          <section>
            <h3 className="font-bold mb-2">Pagamento da Taxa de Matrícula:</h3>
            <p>
              A inscrição só ocorrerá após o pagamento da taxa correspondente.
            </p>
          </section>

          <section>
            <h3 className="font-bold mb-2">Confirmação da Matrícula:</h3>
            <p>
              Após a confirmação da matrícula, o professor ou professora responsável pela turma
              entrará em contato pelo WhatsApp em até 48 horas (certifique-se de cadastrar um número
              de telefone válido).
            </p>
          </section>

          <section>
            <h3 className="font-bold mb-2">Você colocado a um grupo de pais no WhatsApp:</h3>
            <p>
              onde será compartilhadas informações cruciais sobre o desenvolvimento do seu filho.
              Esteja atento às mensagens do grupo para manter-se atualizado.
            </p>
          </section>

          <section>
            <h3 className="font-bold mb-2">Mensalidades:</h3>
            <p>
              As mensalidades podem ser pagas por boleto ou no cartão de crédito, na modalidade
              crédito recorrente.
            </p>
            <p className="mt-2">
              O vencimento é realizado a cada 10 de cada mês, considerando o período de dia 01 ao
              último dia do mês (30 ou 31).
            </p>
          </section>

          <section>
            <h3 className="font-bold mb-2">Cancelamento:</h3>
            <p>
              O caso necessário efetuar um cancelamento, isso pode ser feito a qualquer momento.
            </p>
            <p className="mt-2">
              Solicito o cancelamento com 30 dias de antecedência, entrando em contato pela tabela
              de suporte (48) 98020-3206.
            </p>
          </section>

          <section className="bg-white p-4 rounded border border-gray-300">
            <p className="text-xs">
              Garantir que esses passos sejam seguidos proporcionará uma matrícula tranquila e
              participação efetiva no ano letivo. Informações acerca de matrículas e cancelamentos
              podem ser acessadas no contrato. Em caso de dúvidas, não hesite em entrar em contato
              conosco.
            </p>
          </section>
        </div>

        <button
          onClick={onContinue}
          className="mt-8 w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Entendi, Continuar
        </button>
      </div>
    </div>
  );
};

export default ModalMatriculaInfo;
