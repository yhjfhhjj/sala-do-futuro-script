javascript:(function() {
    const SCRIPT_VERSION = "1.2";
    const TARGET_URL_REGEX = /https:\/\/saladofuturo\.educacao\.sp\.gov\.br\/resultado\/tarefa\/\d+\/resposta\/\d+/;
    const TOASTIFY_CSS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css';
    const TOASTIFY_JS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js';
    const API_BASE_URL = "https://edusp-api.ip.tv";

    // --- VERIFICAÇÃO ESSENCIAL DE LOGIN ---
    // Verifica PRIMEIRO se o usuário está logado ANTES de tentar usar _dadosLogin
    if (typeof _dadosLogin === 'undefined' || !_dadosLogin || !_dadosLogin.auth_token) {
        alert('Atenção: Faça login na plataforma SaladoFuturo primeiro.\n\nDepois de logar, navegue até a página de resultado da tarefa e execute este script novamente.');
        // Impede que o resto do script seja executado se não estiver logado
        return;
    }
    // --- FIM DA VERIFICAÇÃO DE LOGIN ---

    // Só continua se a verificação de login passou
    console.log("Usuário logado. Continuando a execução do script...");

    // Verificação da URL (opcional, mas útil)
    if (!TARGET_URL_REGEX.test(document.location.href)) {
        console.warn("Script executado fora da URL alvo esperada:", document.location.href);
        alert('Aviso: Este script funciona melhor na página de resultado de uma tarefa específica.');
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
                    case "order-sentences": correctAnswer = taskQuestion.options?.sentences?.map(s => s.value) ?? []; break;
                    case "fill-words": correctAnswer = taskQuestion.options?.phrase?.map(i => i.value)?.filter((_, idx) => idx % 2 !== 0) ?? []; break;
                    case "text_ai": correctAnswer = { "0": removeHtmlTags(taskQuestion.comment || '') }; break;
                    case "fill-letters": correctAnswer = taskQuestion.options?.answer; break;
                    case "cloud": correctAnswer = taskQuestion.options?.ids; break;
                    default:
                         if(taskQuestion.options){
                             correctAnswer = Object.fromEntries(Object.keys(taskQuestion.options).filter(oId => taskQuestion.options[oId] !== null && typeof taskQuestion.options[oId] === 'object' && 'answer' in taskQuestion.options[oId]).map(oId => [oId, taskQuestion.options[oId].answer]));
                         } else { correctAnswer = {}; }
                         break;
                }
                 if (correctAnswer !== null && correctAnswer !== undefined) {
                    novoJson.answers[questionId] = { question_id: originalAnswerData.question_id, question_type: questionType, answer: correctAnswer };
                } else {
                     console.warn(`Não foi possível determinar resposta correta para questão ${questionId} (Tipo: ${questionType}).`);
                     novoJson.answers[questionId] = { question_id: originalAnswerData.question_id, question_type: questionType, answer: (questionType === 'text_ai' ? {"0": ""} : (Array.isArray(correctAnswer) ? [] : {})) };
                }
            } catch (error) {
                console.error(`Erro ao processar questão ${questionId} (Tipo: ${questionType}):`, error, taskQuestion);
                sendToast(`Erro processando questão ${questionId}. Ver console.`, 5000, 'error');
                 novoJson.answers[questionId] = { question_id: originalAnswerData.question_id, question_type: questionType, answer: (questionType === 'text_ai' ? {"0": ""} : {}) };
            }
        }
        return novoJson;
    }

    function sendToast(text, duration = 5000, type = 'info') {
        if (typeof Toastify === 'undefined') { console.warn('Toastify não carregado:', `[${type.toUpperCase()}] ${text}`); return; }
        const colors = { info: "linear-gradient(to right, #0080FF, #0059B3)", success: "linear-gradient(to right, #00b09b, #96c93d)", error: "linear-gradient(to right, #ff5f6d, #ffc371)", warning: "linear-gradient(to right, #f7b733, #fc4a1a)" };
        try { Toastify({ text: text, duration: duration, gravity: "bottom", position: "center", stopOnFocus: true, style: { background: colors[type] || colors.info, fontSize: "14px", borderRadius: "5px", padding: "12px 20px", boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)", zIndex: 9999 }, }).showToast(); }
        catch (e) { console.error("Erro ao exibir Toastify:", e); }
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

    async function pegarRespostas(answerId, taskId) {
        const url = `${API_BASE_URL}/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
        console.log("Buscando respostas de:", url);
        try {
            const response = await fetch(url, { method: "GET", headers: HEADERS_TEMPLATE });
            if (!response.ok) { let eTxt = ''; try { eTxt = await response.text(); } catch (e) {} throw new Error(`HTTP ${response.status}: ${response.statusText}. URL: ${url}. Det: ${eTxt}`); }
            const data = await response.json();
             if (!data || !data.task || !data.task.questions) { console.warn("Dados API incompletos:", data); throw new Error("Resposta API ok, mas dados essenciais (task.questions) faltando."); }
            console.log("Respostas recebidas:", data);
            return data;
        } catch (error) { console.error('Erro ao buscar respostas:', error); sendToast(`Erro buscar respostas: ${error.message}`, 6000, 'error'); throw error; }
    }

    async function responderCorretamente(respostasCorrigidas, answerId, taskId) {
        const url = `${API_BASE_URL}/tms/task/${taskId}/answer/${answerId}`;
        console.log("Enviando respostas para:", url);
        try {
            const response = await fetch(url, { method: "PUT", headers: HEADERS_TEMPLATE, body: JSON.stringify(respostasCorrigidas) });
            if (!response.ok) { let eTxt = ''; try { eTxt = await response.text(); } catch (e) {} throw new Error(`HTTP ${response.status}: ${response.statusText}. URL: ${url}. Det: ${eTxt}`); }
            console.log("Respostas enviadas com sucesso.");
        } catch (error) { console.error('Erro ao enviar respostas:', error); sendToast(`Erro enviar respostas: ${error.message}`, 6000, 'error'); throw error; }
    }

    async function fetchAndResubmitCorrectAnswers(answerId, taskId) {
        if (!answerId || !taskId) { console.error("ID resposta/tarefa inválido.", { answerId, taskId }); sendToast("Erro: ID Resposta/Tarefa inválido.", 5000, 'error'); return; }
        try {
            sendToast(`Buscando respostas (Tarefa ${taskId})...`, 3000, 'info');
            const respostasOriginais = await pegarRespostas(answerId, taskId);
            sendToast("Processando respostas...", 2000, 'info');
            const respostasPayload = transformJson(respostasOriginais);
            sendToast("Enviando correção...", 3000, 'info');
            await responderCorretamente(respostasPayload, answerId, taskId);
            sendToast("Tarefa corrigida e reenviada!", 5000, 'success');
            console.log("Correção automática concluída.");
        } catch (error) { console.error('Falha na correção automática:', error); sendToast('Falha na correção. Ver console.', 6000, 'error'); }
    }

    function setupFetchInterceptor() {
        if (window.fetch.isCustomInterceptor) { console.log("Interceptor já configurado."); sendToast("Monitoramento já ativo.", 3000, 'info'); return; }
        const originalFetch = window.fetch;
        const targetApiRegex = new RegExp(`^${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/tms/task/\\d+/answer$`);
        window.fetch = async function(input, init) {
            let url = typeof input === 'string' ? input : input?.url;
            let method = init?.method?.toUpperCase() || 'GET';
            const isTarget = (method === 'POST' && targetApiRegex.test(url));
            if (isTarget) { console.log("Interceptado POST para:", url); }
            const responsePromise = originalFetch.apply(this, arguments);
             if (isTarget) {
                responsePromise.then(async (response) => {
                    const cloned = response.clone();
                    try {
                        if (!response.ok) { console.warn(`Submissão original falhou: ${response.status}`); return; }
                        const data = await cloned.json();
                        console.log("Resposta submissão original:", data);
                        if (data && data.id && data.task_id && data.status !== "draft") {
                            sendToast("Submissão detectada! Iniciando correção...", 3000, 'info');
                            setTimeout(() => { fetchAndResubmitCorrectAnswers(data.id, data.task_id).catch(err => { console.error("Erro não capturado na correção:", err); sendToast("Erro inesperado na correção.", 5000, 'error'); }); }, 100);
                        } else if (data && data.status === "draft") { console.log("Submissão salva como rascunho."); }
                        else { console.warn("Resposta submissão sem dados esperados ou status inválido:", data); }
                    } catch (err) { console.error('Erro processar JSON submissão:', err); try { const txt = await cloned.text(); console.error("Corpo resposta (texto):", txt); sendToast('Erro ler resposta submissão. Ver console.', 5000, 'error'); } catch (textErr) { console.error("Não foi possível ler resposta (JSON/texto).", textErr); sendToast('Erro crítico processar resposta submissão.', 5000, 'error'); } }
                }).catch(networkError => { console.error("Erro rede submissão interceptada:", networkError); sendToast(`Erro rede submissão: ${networkError.message}`, 5000, 'error'); });
            }
            return responsePromise;
        };
        window.fetch.isCustomInterceptor = true;
        console.log("Interceptor de fetch configurado.");
    }

    async function initialize() {
        console.log(`Carregando Correção Automática v${SCRIPT_VERSION}...`);
        let toastifyLoaded = false;
        try {
            await loadCss(TOASTIFY_CSS_URL);
            await loadScript(TOASTIFY_JS_URL);
            toastifyLoaded = true;
            console.log("Toastify carregado.");
            sendToast("Recursos carregados. Monitorando envios...", 3000, 'success');
            setupFetchInterceptor();
        } catch (error) {
            console.error('Falha ao carregar dependências (Toastify):', error);
            alert(`Erro: Não foi possível carregar recursos (${error.message}). Notificações visuais podem falhar.`);
            if (!toastifyLoaded) {
                 console.warn("Tentando configurar interceptor sem Toastify...");
                 try { setupFetchInterceptor(); alert("Monitoramento iniciado, mas notificações visuais desativadas (erro)."); }
                 catch (setupError) { console.error("Falha configurar interceptor pós erro Toastify:", setupError); alert("Erro crítico iniciar monitoramento. Ver console."); }
            }
        }
    }

    // A verificação de login já aconteceu no topo. Se chegou aqui, está logado.
    initialize().catch(err => {
         console.error("Erro inesperado na inicialização:", err);
         alert("Erro inesperado ao iniciar script. Ver console.");
    });

})();
