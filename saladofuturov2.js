javascript:(function() {
    const SCRIPT_VERSION = "1.1-revised";
    const TARGET_URL_REGEX = /https:\/\/saladofuturo\.educacao\.sp\.gov\.br\/resultado\/tarefa\/\d+\/resposta\/\d+/;
    const TOASTIFY_CSS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css';
    const TOASTIFY_JS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js';
    const API_BASE_URL = "https://edusp-api.ip.tv";

    if (typeof _dadosLogin === 'undefined' || !_dadosLogin.auth_token) {
        alert('Erro Crítico: Informações de login (_dadosLogin) não encontradas. O script não pode continuar.');
        return;
    }
    if (!TARGET_URL_REGEX.test(document.location.href)) {
        console.warn("Script executado fora da URL alvo esperada:", document.location.href);
        // alert('Aviso: Este script deve ser executado na página de resultado de uma tarefa.');
    }

    const AUTH_TOKEN = _dadosLogin.auth_token;
    const HEADERS_TEMPLATE = {
        "x-api-realm": "edusp",
        "x-api-platform": "webclient",
        "x-api-key": AUTH_TOKEN,
        "content-type": "application/json"
    };

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
        if (!jsonOriginal || !jsonOriginal.task || !jsonOriginal.task.questions || !jsonOriginal.answers) {
            throw new Error("Dados de resposta original inválidos ou incompletos para transformação.");
        }

        let novoJson = {
            accessed_on: jsonOriginal.accessed_on || new Date().toISOString(),
            executed_on: jsonOriginal.executed_on || new Date().toISOString(),
            answers: {}
        };

        for (let questionId in jsonOriginal.answers) {
             if (!jsonOriginal.answers.hasOwnProperty(questionId)) continue;

            let originalAnswerData = jsonOriginal.answers[questionId];
            let taskQuestion = jsonOriginal.task.questions.find(q => q.id === parseInt(questionId));

            if (!taskQuestion || !taskQuestion.type || !originalAnswerData) {
                console.warn(`Dados incompletos para questão ID ${questionId}. Pulando.`);
                continue;
            }

            let correctAnswer = null;
            let questionType = taskQuestion.type;

            try {
                switch (questionType) {
                    case "order-sentences":
                        correctAnswer = taskQuestion.options?.sentences?.map(sentence => sentence.value) ?? [];
                        break;
                    case "fill-words":
                        correctAnswer = taskQuestion.options?.phrase
                            ?.map(item => item.value)
                            ?.filter((_, index) => index % 2 !== 0) ?? [];
                        break;
                    case "text_ai":
                        let rawAnswer = taskQuestion.comment || '';
                        correctAnswer = { "0": removeHtmlTags(rawAnswer) };
                        break;
                    case "fill-letters":
                        correctAnswer = taskQuestion.options?.answer;
                        break;
                    case "cloud":
                        correctAnswer = taskQuestion.options?.ids;
                        break;
                    case "multiple-choice":
                    case "single-choice":
                    case "true-false":
                    default:
                         if(taskQuestion.options){
                             correctAnswer = Object.fromEntries(
                                Object.keys(taskQuestion.options)
                                    .filter(optionId => taskQuestion.options[optionId] !== null && typeof taskQuestion.options[optionId] === 'object' && 'answer' in taskQuestion.options[optionId])
                                    .map(optionId => [optionId, taskQuestion.options[optionId].answer])
                             );
                         } else {
                             correctAnswer = {};
                         }
                        break;
                }

                 if (correctAnswer !== null && correctAnswer !== undefined) {
                    novoJson.answers[questionId] = {
                        question_id: originalAnswerData.question_id,
                        question_type: questionType,
                        answer: correctAnswer
                    };
                } else {
                     console.warn(`Não foi possível determinar a resposta correta para a questão ${questionId} (Tipo: ${questionType}). Dados da questão:`, taskQuestion);
                     novoJson.answers[questionId] = { // Enviar resposta vazia/default? Ou pular? Decidi incluir vazio.
                         question_id: originalAnswerData.question_id,
                         question_type: questionType,
                         answer: (questionType === 'text_ai' ? {"0": ""} : (Array.isArray(correctAnswer) ? [] : {})) // Default baseado no tipo esperado
                     };
                }

            } catch (error) {
                console.error(`Erro ao processar questão ${questionId} (Tipo: ${questionType}):`, error, taskQuestion);
                sendToast(`Erro processando questão ${questionId}. Verifique o console.`, 5000, 'error');
                 novoJson.answers[questionId] = { // Inclui uma entrada vazia para não falhar o PUT?
                     question_id: originalAnswerData.question_id,
                     question_type: questionType,
                     answer: (questionType === 'text_ai' ? {"0": ""} : {}) // Envia objeto vazio como fallback
                 };
            }
        }
        return novoJson;
    }


    function sendToast(text, duration = 5000, type = 'info') {
        if (typeof Toastify === 'undefined') {
            console.warn('Toastify não carregado:', `[${type.toUpperCase()}] ${text}`);
            return;
        }
        const colors = {
            info: "linear-gradient(to right, #0080FF, #0059B3)",
            success: "linear-gradient(to right, #00b09b, #96c93d)",
            error: "linear-gradient(to right, #ff5f6d, #ffc371)",
            warning: "linear-gradient(to right, #f7b733, #fc4a1a)"
        };
        try {
            Toastify({
                text: text,
                duration: duration,
                gravity: "bottom",
                position: "center",
                stopOnFocus: true,
                style: {
                    background: colors[type] || colors.info,
                    fontSize: "14px",
                    borderRadius: "5px",
                    padding: "12px 20px",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
                    zIndex: 9999 // Ensure it's on top
                },
            }).showToast();
        } catch (e) {
            console.error("Erro ao exibir Toastify:", e);
        }
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${url}"]`)) {
                resolve(); return;
            }
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = resolve;
            script.onerror = (e) => reject(new Error(`Falha ao carregar script: ${url}. Evento: ${e.type}`));
            document.head.appendChild(script);
        });
    }

    async function loadCss(url) {
        return new Promise((resolve, reject) => {
             if (document.querySelector(`link[href="${url}"]`)) {
                resolve(); return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = (e) => reject(new Error(`Falha ao carregar CSS: ${url}. Evento: ${e.type}`));
            document.head.appendChild(link);
        });
    }

    async function pegarRespostas(answerId, taskId) {
        const url = `${API_BASE_URL}/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
        console.log("Buscando respostas corretas de:", url);
        try {
            const response = await fetch(url, { method: "GET", headers: HEADERS_TEMPLATE });
            if (!response.ok) {
                let errorText = '';
                try { errorText = await response.text(); } catch (e) { /* ignore */ }
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}. URL: ${url}. Detalhes: ${errorText}`);
            }
            const data = await response.json();
            console.log("Respostas corretas recebidas:", data);
             if (!data || !data.task || !data.task.questions) {
                 console.warn("Dados recebidos da API parecem incompletos:", data);
                 throw new Error("Resposta da API recebida, mas dados essenciais (task.questions) estão faltando.");
             }
            return data;
        } catch (error) {
            console.error('Erro detalhado ao buscar respostas corretas:', error);
            sendToast(`Erro ao buscar respostas: ${error.message}`, 6000, 'error');
            throw error;
        }
    }

    async function responderCorretamente(respostasCorrigidas, answerId, taskId) {
        const url = `${API_BASE_URL}/tms/task/${taskId}/answer/${answerId}`;
        console.log("Enviando respostas corrigidas para:", url);
        // console.log("Payload:", JSON.stringify(respostasCorrigidas, null, 2)); // Uncomment for deep debug
        try {
            const response = await fetch(url, {
                method: "PUT",
                headers: HEADERS_TEMPLATE,
                body: JSON.stringify(respostasCorrigidas)
            });
            if (!response.ok) {
                let errorText = '';
                try { errorText = await response.text(); } catch (e) { /* ignore */ }
                throw new Error(`Erro HTTP ${response.status}: ${response.statusText}. URL: ${url}. Detalhes: ${errorText}`);
            }
            console.log("Respostas corrigidas enviadas com sucesso.");
            // const result = await response.json(); // Process if needed
        } catch (error) {
            console.error('Erro detalhado ao enviar respostas corrigidas:', error);
            sendToast(`Erro ao enviar respostas: ${error.message}`, 6000, 'error');
            throw error;
        }
    }

    async function fetchAndResubmitCorrectAnswers(answerId, taskId) {
        if (!answerId || !taskId) {
             console.error("ID da resposta ou da tarefa inválido.", { answerId, taskId });
             sendToast("Erro interno: ID da Resposta/Tarefa inválido.", 5000, 'error');
             return;
        }
        try {
            sendToast(`Buscando respostas corretas (Tarefa ${taskId})...`, 3000, 'info');
            const respostasOriginaisComTarefa = await pegarRespostas(answerId, taskId);

            sendToast("Processando e formatando respostas...", 2000, 'info');
            const respostasCorrigidasPayload = transformJson(respostasOriginaisComTarefa);

            sendToast("Enviando respostas corretas...", 3000, 'info');
            await responderCorretamente(respostasCorrigidasPayload, answerId, taskId);

            sendToast("Tarefa corrigida e reenviada com sucesso!", 5000, 'success');
            console.log("Processo de correção automática concluído com sucesso.");

        } catch (error) {
            console.error('Falha no processo de correção automática:', error);
            sendToast('Falha na correção automática. Verifique o console.', 6000, 'error');
        }
    }

    function setupFetchInterceptor() {
        if (window.fetch.isCustomInterceptor) {
            console.log("Interceptor já configurado. Ignorando reconfiguração.");
            sendToast("Monitoramento já ativo.", 3000, 'info');
            return; // Evita adicionar múltiplos interceptors
        }

        const originalFetch = window.fetch;
        const targetApiRegex = new RegExp(`^${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/tms/task/\\d+/answer$`);

        window.fetch = async function(input, init) {
            let url = typeof input === 'string' ? input : input?.url;
            let method = init?.method?.toUpperCase() || 'GET';
            const isTargetCall = (method === 'POST' && targetApiRegex.test(url));

            if (isTargetCall) {
                 console.log("Interceptado POST para:", url);
            }

            const responsePromise = originalFetch.apply(this, arguments);

             if (isTargetCall) {
                responsePromise.then(async (response) => {
                    const clonedResponse = response.clone();
                    try {
                        if (!response.ok) { // Handle API errors on initial submit
                            console.warn(`Submissão original falhou com status ${response.status}`);
                            // Optionally show a toast here? Depends if user gets feedback already.
                            return; // Don't attempt correction if initial submit failed
                        }

                        const data = await clonedResponse.json();
                        console.log("Resposta da submissão original:", data);

                        if (data && data.id && data.task_id && data.status !== "draft") {
                            sendToast("Submissão detectada! Iniciando correção...", 3000, 'info');
                            // Use setTimeout to avoid blocking and potential race conditions
                            setTimeout(() => {
                                fetchAndResubmitCorrectAnswers(data.id, data.task_id).catch(err => {
                                    console.error("Erro não capturado no fluxo principal de correção:", err);
                                    sendToast("Erro inesperado no processo de correção.", 5000, 'error');
                                });
                            }, 100); // Pequeno delay
                        } else if (data && data.status === "draft") {
                            console.log("Submissão salva como rascunho. Nenhuma ação automática.");
                        } else {
                             console.warn("Resposta da submissão não continha dados esperados ou status inválido:", data);
                        }
                    } catch (err) {
                        console.error('Erro ao processar JSON da submissão original:', err);
                         try {
                            const textData = await clonedResponse.text();
                            console.error("Corpo da resposta (texto):", textData);
                            sendToast('Erro ao ler resposta da submissão. Ver console.', 5000, 'error');
                        } catch (textErr) {
                             console.error("Não foi possível ler a resposta como JSON ou texto.", textErr);
                             sendToast('Erro crítico ao processar resposta da submissão.', 5000, 'error');
                        }
                    }
                }).catch(networkError => {
                    console.error("Erro de rede na submissão original interceptada:", networkError);
                    sendToast(`Erro de rede na submissão: ${networkError.message}`, 5000, 'error');
                });
            }
            return responsePromise;
        };

        window.fetch.isCustomInterceptor = true; // Flag to prevent re-wrapping
        console.log("Interceptor de fetch configurado.");
    }

    async function initialize() {
        console.log(`Carregando Correção Automática v${SCRIPT_VERSION}...`);
        let toastifyLoaded = false;
        try {
            // Tenta carregar CSS primeiro, depois JS
            await loadCss(TOASTIFY_CSS_URL);
            await loadScript(TOASTIFY_JS_URL);
            toastifyLoaded = true;
            console.log("Toastify carregado.");
            sendToast("Recursos carregados. Monitorando envios...", 3000, 'success');
            setupFetchInterceptor();
        } catch (error) {
            console.error('Falha ao carregar dependências (Toastify):', error);
            alert(`Erro: Não foi possível carregar recursos necessários (${error.message}). Notificações visuais podem falhar.`);
            // Tenta continuar mesmo sem Toastify visual
            if (!toastifyLoaded) {
                 console.warn("Tentando configurar interceptor mesmo sem Toastify...");
                 try {
                     setupFetchInterceptor();
                     alert("Monitoramento iniciado, mas notificações visuais estão desativadas devido a erro de carregamento.");
                 } catch (setupError) {
                     console.error("Falha ao configurar interceptor após erro do Toastify:", setupError);
                     alert("Erro crítico ao iniciar o monitoramento. Verifique o console.");
                 }
            }
        }
    }

    initialize().catch(err => {
         console.error("Erro inesperado durante a inicialização:", err);
         alert("Ocorreu um erro inesperado ao iniciar o script. Verifique o console.");
    });

})();
