javascript:(function() {
    const SCRIPT_VERSION = "1.4-original-wait";
    const POLLING_INTERVAL_MS = 500;
    const MAX_WAIT_SECONDS = 25; // Aumentei um pouco o tempo de espera
    const TOASTIFY_CSS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css';
    const TOASTIFY_JS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js';
    const API_BASE_URL = "https://edusp-api.ip.tv"; // Derivado das URLs originais

    let loginCheckInterval = null;
    let waitStartTime = Date.now();
    let headers_template = null; // Será definido APÓS o login ser detectado
    let toastifyLoaded = false;

    console.log(`Correção v${SCRIPT_VERSION}: Aguardando login ser detectado na página...`);

    // --- Funções Utilitárias (Definidas globalmente no escopo do bookmarklet) ---
    // Elas não dependem do login diretamente para serem definidas

    function removeHtmlTags(htmlString) {
        try {
            if (!htmlString) return '';
            const div = document.createElement('div');
            div.innerHTML = htmlString;
            return div.textContent || div.innerText || '';
        } catch (e) {
            console.error("Erro ao remover tags HTML:", e);
            return htmlString;
        }
    }

    function transformJson(jsonOriginal) {
        // Esta função é complexa e depende da estrutura dos dados, mas não do estado de login para ser *definida*
        // Adaptação da função original
        if (!jsonOriginal || !jsonOriginal.task || !jsonOriginal.task.questions || !jsonOriginal.answers) {
             console.error("Dados inválidos recebidos em transformJson:", jsonOriginal);
             throw new Error("Dados de resposta original inválidos ou incompletos para transformação.");
         }
        let novoJson = {
            accessed_on: jsonOriginal.accessed_on || new Date().toISOString(),
            executed_on: jsonOriginal.executed_on || new Date().toISOString(), // Garante que executed_on exista
            answers: {}
        };

        for (let questionId in jsonOriginal.answers) {
             if (!jsonOriginal.answers.hasOwnProperty(questionId)) continue;

            let originalAnswerData = jsonOriginal.answers[questionId];
            // Encontra a questão correspondente nos dados da tarefa (incluídos na resposta do GET)
            let taskQuestion = jsonOriginal.task.questions.find(q => q.id === parseInt(questionId));

            if (!taskQuestion || !taskQuestion.type || !originalAnswerData) {
                console.warn(`Dados incompletos para questão ID ${questionId}. Pulando transformação.`);
                continue; // Pula para a próxima questão se dados essenciais faltarem
            }

            let correctAnswer = null;
            let questionType = taskQuestion.type;

            try {
                // Lógica de extração da resposta correta baseada no tipo da questão
                switch (questionType) {
                    case "order-sentences":
                        correctAnswer = taskQuestion.options?.sentences?.map(sentence => sentence.value) ?? [];
                        break;
                    case "fill-words":
                        correctAnswer = taskQuestion.options?.phrase
                            ?.map(item => item.value)
                            ?.filter((_, index) => index % 2 !== 0) ?? []; // Apenas índices ímpares contêm as respostas
                        break;
                    case "text_ai":
                         // A resposta correta para text_ai geralmente está no 'comment' da questão
                         let rawAnswer = taskQuestion.comment || '';
                         correctAnswer = { "0": removeHtmlTags(rawAnswer) }; // Formato esperado: objeto com chave "0"
                        break;
                    case "fill-letters":
                        correctAnswer = taskQuestion.options?.answer; // Resposta direta
                        break;
                    case "cloud":
                         correctAnswer = taskQuestion.options?.ids; // Array de IDs
                        break;
                    // Adicione mais casos conforme necessário para outros tipos de questão
                    case "multiple-choice":
                    case "single-choice":
                    case "true-false":
                    default: // Assume um formato padrão onde a resposta está em options[optionId].answer
                         if(taskQuestion.options){
                             correctAnswer = Object.fromEntries(
                                Object.keys(taskQuestion.options)
                                    // Garante que a opção existe, é um objeto e tem a propriedade 'answer'
                                    .filter(optionId => taskQuestion.options[optionId] !== null && typeof taskQuestion.options[optionId] === 'object' && 'answer' in taskQuestion.options[optionId])
                                    .map(optionId => [optionId, taskQuestion.options[optionId].answer])
                             );
                         } else {
                             correctAnswer = {}; // Objeto vazio se não houver opções
                         }
                        break;
                }

                 // Adiciona a resposta corrigida ao novo JSON se encontrada
                 if (correctAnswer !== null && correctAnswer !== undefined) {
                    novoJson.answers[questionId] = {
                        question_id: originalAnswerData.question_id, // Mantém o ID original da questão
                        question_type: questionType,
                        answer: correctAnswer // Adiciona a resposta correta extraída
                    };
                } else {
                     // Loga um aviso se não conseguiu extrair a resposta
                     console.warn(`Não foi possível determinar a resposta correta para a questão ${questionId} (Tipo: ${questionType}). Dados da questão:`, taskQuestion);
                     // Inclui uma entrada vazia para evitar erros no PUT, adaptando ao tipo esperado
                      novoJson.answers[questionId] = {
                         question_id: originalAnswerData.question_id,
                         question_type: questionType,
                         answer: (questionType === 'text_ai' ? {"0": ""} : (Array.isArray(correctAnswer) ? [] : {}))
                     };
                }

            } catch (error) {
                 // Captura erros durante o processamento de uma questão específica
                 console.error(`Erro ao processar questão ${questionId} (Tipo: ${questionType}):`, error, taskQuestion);
                 sendToast(`Erro processando questão ${questionId}. Ver console.`, 5000, 'error');
                 // Inclui uma entrada vazia como fallback em caso de erro
                  novoJson.answers[questionId] = {
                     question_id: originalAnswerData.question_id,
                     question_type: questionType,
                     answer: (questionType === 'text_ai' ? {"0": ""} : {})
                 };
            }
        }
        return novoJson; // Retorna o objeto formatado para o PUT request
    }


    function sendToast(text, duration = 5000, type = 'info') {
        // Usa console se Toastify não estiver pronto
        if (typeof Toastify === 'undefined' || !toastifyLoaded) {
            console.log(`Toastify Fallback [${type.toUpperCase()}]: ${text}`);
            return;
        }
        const colors = { info: "linear-gradient(to right, #0080FF, #0059B3)", success: "linear-gradient(to right, #00b09b, #96c93d)", error: "linear-gradient(to right, #ff5f6d, #ffc371)", warning: "linear-gradient(to right, #f7b733, #fc4a1a)" };
        try {
            Toastify({ text: text, duration: duration, gravity: "bottom", position: "center", stopOnFocus: true, style: { background: colors[type] || colors.info, fontSize: "14px", borderRadius: "5px", padding: "12px 20px", boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)", zIndex: 9999 }, }).showToast();
        } catch (e) { console.error("Erro ao exibir Toastify:", e); }
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
            const script = document.createElement('script'); script.src = url; script.async = true; script.onload = resolve; script.onerror = (e) => reject(new Error(`Falha script: ${url}. Ev: ${e.type}`)); document.head.appendChild(script);
        });
    }

    async function loadCss(url) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${url}"]`)) { resolve(); return; }
            const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = url; link.onload = resolve; link.onerror = (e) => reject(new Error(`Falha CSS: ${url}. Ev: ${e.type}`)); document.head.appendChild(link);
        });
    }

    // --- Funções Principais (Serão chamadas APÓS o login e definição dos headers) ---
    // Elas precisam de 'headers_template' que só existe depois do login

    async function pegarRespostas(task_id, id) {
        if (!headers_template) throw new Error("Headers não definidos em pegarRespostas");
        const get_anwsers_url = `${API_BASE_URL}/tms/task/${id}/answer/${task_id}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
        console.log("Buscando respostas de:", get_anwsers_url);
        try {
            const response = await fetch(get_anwsers_url, { method: "GET", headers: headers_template });
            if (!response.ok) { let eTxt = ''; try { eTxt = await response.text(); } catch (e) {} throw new Error(`HTTP ${response.status}: ${response.statusText}. URL: ${get_anwsers_url}. Det: ${eTxt}`); }
            const data = await response.json();
            if (!data || !data.task || !data.task.questions) { console.warn("Dados API incompletos:", data); throw new Error("Resposta API ok, mas dados essenciais (task.questions) faltando."); }
            console.log("Dados completos recebidos:", data);
            return data;
        } catch (error) { console.error('Erro detalhado ao buscar respostas:', error); sendToast(`Erro ao buscar respostas: ${error.message}`, 6000, 'error'); throw error; }
    }

    async function responderCorretamente(respostasAnteriores, task_id, id) {
        if (!headers_template) throw new Error("Headers não definidos em responderCorretamente");
        const put_answers_url = `${API_BASE_URL}/tms/task/${id}/answer/${task_id}`;
        console.log("Enviando respostas corrigidas para:", put_answers_url);
        const novasRespostas = transformJson(respostasAnteriores); // Usa a função global
        console.log("Payload para PUT:", JSON.stringify(novasRespostas)); // Log para debug
        try {
            const response = await fetch(put_answers_url, { method: "PUT", headers: headers_template, body: JSON.stringify(novasRespostas) });
            if (!response.ok) { let eTxt = ''; try { eTxt = await response.text(); } catch (e) {} throw new Error(`HTTP ${response.status}: ${response.statusText}. URL: ${put_answers_url}. Det: ${eTxt}`); }
            console.log("Respostas corrigidas enviadas com sucesso.");
        } catch (error) { console.error('Erro detalhado ao enviar respostas corrigidas:', error); sendToast(`Erro ao enviar respostas: ${error.message}`, 6000, 'error'); throw error; }
    }

    // --- Lógica Principal de Inicialização e Interceptação (Executada APÓS login) ---
    async function initializeAndIntercept() {
        const AUTH_TOKEN = _dadosLogin.auth_token;
        console.log(`Login detectado com token: ...${AUTH_TOKEN.slice(-6)}`);

        // Define headers_template AGORA que temos o token
        headers_template = {
            "x-api-realm": "edusp",
            "x-api-platform": "webclient",
            "x-api-key": AUTH_TOKEN,
            "content-type": "application/json"
        };

        try {
            // Carrega CSS e JS do Toastify
            await loadCss(TOASTIFY_CSS_URL);
            await loadScript(TOASTIFY_JS_URL);
            toastifyLoaded = true; // Marca como carregado
            console.log("Toastify carregado.");
            sendToast("Login detectado! Iniciando monitoramento...", 4000, 'success');

            // Configura o interceptor de fetch
            if (window.fetch.isCustomInterceptor) {
                console.log("Interceptor já ativo.");
                sendToast("Monitoramento já estava ativo.", 3000, 'info');
                return;
            }

            const originalFetch = window.fetch;
            // Regex para interceptar o POST inicial da resposta do aluno
            const targetInterceptRegex = new RegExp(`^${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/tms/task/\\d+/answer$`);

            window.fetch = async function(input, init) {
                let url = typeof input === 'string' ? input : input?.url;
                let method = init?.method?.toUpperCase() || 'GET';
                const isTargetCall = (method === 'POST' && targetInterceptRegex.test(url));

                // Chama o fetch original ANTES de processar a resposta interceptada
                const responsePromise = originalFetch.apply(this, arguments);

                if (isTargetCall) {
                    console.log("Interceptado POST de submissão:", url);
                    // Processa a RESPOSTA da submissão original
                    responsePromise.then(async (response) => {
                        const clonedResponse = response.clone();
                        try {
                            // Verifica se a submissão original foi bem-sucedida (status 2xx)
                            if (!response.ok) {
                                console.warn(`Submissão original falhou com status ${response.status}. Não tentará corrigir.`);
                                let errorBody = ''; try {errorBody = await clonedResponse.text();} catch(e){}
                                console.warn("Corpo do erro da submissão:", errorBody);
                                return; // Sai se a submissão original já deu erro
                            }

                            const data = await clonedResponse.json();
                            console.log("Resposta da submissão original:", data);

                            // Verifica se temos os IDs e se não é um rascunho
                            if (data && data.id && data.task_id && data.status !== "draft") {
                                sendToast("Submissão detectada! Iniciando correção...", 3000, 'info');
                                // Chama a função de correção com um pequeno delay
                                setTimeout(() => {
                                    ReplayAnswer(data.id, data.task_id).catch(err => {
                                        console.error("Erro não capturado no fluxo principal de ReplayAnswer:", err);
                                        sendToast("Erro inesperado durante a correção. Verifique o console.", 6000, 'error');
                                    });
                                }, 150); // Delay para garantir que a UI não trave
                            } else if (data && data.status === "draft") {
                                console.log("Submissão detectada, mas é um rascunho (draft). Nenhuma ação automática.");
                            } else {
                                console.warn("Resposta da submissão não continha os dados esperados (id, task_id) ou status inválido:", data);
                            }
                        } catch (err) {
                             console.error('Erro ao processar a resposta JSON da submissão original:', err);
                             try { const textData = await clonedResponse.text(); console.error("Corpo da resposta (texto):", textData); sendToast('Erro ao ler resposta da submissão. Ver console.', 5000, 'error'); }
                             catch (textErr) { console.error("Não foi possível ler a resposta como JSON ou texto.", textErr); sendToast('Erro crítico ao processar resposta da submissão.', 5000, 'error'); }
                        }
                    }).catch(networkError => {
                        // Erro na própria requisição fetch original interceptada
                        console.error("Erro de rede na requisição fetch original interceptada:", networkError);
                        sendToast(`Erro de rede na submissão: ${networkError.message}`, 5000, 'error');
                    });
                }
                // Retorna a promessa original do fetch imediatamente
                return responsePromise;
            };
             window.fetch.isCustomInterceptor = true; // Marca que o interceptor foi aplicado
             console.log("Interceptor de fetch configurado.");


            // Função que executa a lógica de correção (chamada pelo interceptor)
            async function ReplayAnswer(answerId, taskId) {
                console.log(`Iniciando ReplayAnswer para answerId: ${answerId}, taskId: ${taskId}`);
                try {
                    sendToast(`Buscando respostas corretas (ID: ${answerId})...`, 3000, 'info');
                    // Usa a função pegarRespostas definida neste escopo
                    const respostasCompletas = await pegarRespostas(answerId, taskId);

                    sendToast("Formatando respostas corretas...", 2000, 'info');
                    // A função transformJson já está definida globalmente

                    sendToast("Enviando respostas corrigidas...", 3000, 'info');
                    // Usa a função responderCorretamente definida neste escopo
                    await responderCorretamente(respostasCompletas, taskId, answerId); // Atenção: A ordem dos IDs pode ser trocada aqui dependendo da API

                    sendToast("Tarefa corrigida e reenviada com sucesso!", 5000, 'success');
                    console.log("Processo de ReplayAnswer concluído com sucesso.");

                } catch (error) {
                     console.error("Erro durante o processo de ReplayAnswer:", error);
                     // O toast de erro específico já deve ter sido mostrado pelas funções internas
                     sendToast("Falha ao corrigir/reenviar a tarefa. Verifique o console.", 6000, 'error');
                }
            }

        } catch (error) {
            console.error("Erro ao carregar dependências ou configurar interceptor:", error);
            alert(`Erro crítico ao inicializar o script (${error.message}). Verifique o console.`);
            toastifyLoaded = false; // Garante fallback se Toastify falhou
        }
    }

    // --- Loop de Verificação de Login (Ponto de Entrada) ---
    loginCheckInterval = setInterval(function() {
        // Verifica se _dadosLogin existe globalmente e tem a propriedade auth_token
        if (typeof _dadosLogin !== 'undefined' && _dadosLogin && typeof _dadosLogin.auth_token === 'string' && _dadosLogin.auth_token.length > 10) { // Verifica se token parece válido
            clearInterval(loginCheckInterval); // Para de verificar
            initializeAndIntercept();       // Inicia o script principal
        } else {
            // Verifica se o tempo máximo de espera foi excedido
            const elapsedTime = (Date.now() - waitStartTime) / 1000;
            if (elapsedTime > MAX_WAIT_SECONDS) {
                clearInterval(loginCheckInterval); // Para de verificar
                console.error(`Login não detectado na variável '_dadosLogin' após ${MAX_WAIT_SECONDS} segundos.`);
                alert(`Não foi possível detectar automaticamente os dados de login (_dadosLogin) na página após ${MAX_WAIT_SECONDS}s.\n\nPossíveis causas:\n- Você não está logado.\n- A página carregou de forma inesperada.\n- O nome da variável de login mudou na plataforma.\n\nTente recarregar a página completamente e executar o script novamente.`);
                // Opcional: tentar inspecionar 'window' para ver se a variável tem outro nome? (Complexo)
                // console.log("Variáveis globais em window:", Object.keys(window));
            } else {
                 // Opcional: logar que ainda está esperando
                 // console.log(`Aguardando _dadosLogin... (${Math.round(elapsedTime)}s)`);
            }
        }
    }, POLLING_INTERVAL_MS); // Repete a verificação a cada X ms

})();
