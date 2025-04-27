javascript:(function() {
    const SCRIPT_VERSION = "1.3-wait";
    const POLLING_INTERVAL_MS = 500; // Verificar a cada 500ms
    const MAX_WAIT_SECONDS = 20; // Esperar no máximo 20 segundos pelo login
    const TARGET_URL_REGEX = /https:\/\/saladofuturo\.educacao\.sp\.gov\.br\/resultado\/tarefa\/\d+\/resposta\/\d+/;
    const TOASTIFY_CSS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css';
    const TOASTIFY_JS_URL = 'https://cdn.jsdelivr.net/npm/toastify-js';
    const API_BASE_URL = "https://edusp-api.ip.tv";

    let AUTH_TOKEN = null;
    let HEADERS_TEMPLATE = null;
    let toastifyLoaded = false;
    let loginCheckInterval = null;
    let waitStartTime = Date.now();

    console.log(`Correção Automática v${SCRIPT_VERSION}: Iniciando verificação de login...`);
    // Alerta inicial para o usuário saber que algo está acontecendo
    // alert(`Script de Correção Ativado!\n\nAguardando detecção de login na plataforma...`);

    // --- Funções Utilitárias e Lógica Principal (Definidas antes de serem usadas) ---

    function sendToast(text, duration = 5000, type = 'info') {
        // Se Toastify não carregou ainda, usa console e alert como fallback
        if (typeof Toastify === 'undefined' || !toastifyLoaded) {
            console.warn(`Toastify fallback [${type.toUpperCase()}]: ${text}`);
            // Evita alert para mensagens de 'info' não essenciais durante a inicialização
            if (type === 'error' || type === 'warning' || type === 'success') {
               // alert(`[${type.toUpperCase()}] ${text}`); // Descomente se quiser alert como fallback
            }
            return;
        }
        const colors = { info: "linear-gradient(to right, #0080FF, #0059B3)", success: "linear-gradient(to right, #00b09b, #96c93d)", error: "linear-gradient(to right, #ff5f6d, #ffc371)", warning: "linear-gradient(to right, #f7b733, #fc4a1a)" };
        try { Toastify({ text: text, duration: duration, gravity: "bottom", position: "center", stopOnFocus: true, style: { background: colors[type] || colors.info, fontSize: "14px", borderRadius: "5px", padding: "12px 20px", boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)", zIndex: 9999 }, }).showToast(); }
        catch (e) { console.error("Erro ao exibir Toastify:", e); }
    }

    function removeHtmlTags(htmlString) { /* ...definição da função como antes ... */ try { if (!htmlString) return ''; const div = document.createElement('div'); div.innerHTML = htmlString; return div.textContent || div.innerText || ''; } catch (e) { console.error("Erro ao remover tags HTML:", e); return htmlString; } }
    function transformJson(jsonOriginal) { /* ...definição da função como antes ... */ if (!jsonOriginal || !jsonOriginal.task || !jsonOriginal.task.questions || !jsonOriginal.answers) { throw new Error("Dados de resposta original inválidos."); } let nJson = { accessed_on: jsonOriginal.accessed_on || new Date().toISOString(), executed_on: jsonOriginal.executed_on || new Date().toISOString(), answers: {} }; for (let qId in jsonOriginal.answers) { if (!jsonOriginal.answers.hasOwnProperty(qId)) continue; let oAns = jsonOriginal.answers[qId]; let tQ = jsonOriginal.task.questions.find(q => q.id === parseInt(qId)); if (!tQ || !tQ.type || !oAns) { console.warn(`Dados incompletos qID ${qId}. Pulando.`); continue; } let cAns = null; let qType = tQ.type; try { switch (qType) { case "order-sentences": cAns = tQ.options?.sentences?.map(s => s.value) ?? []; break; case "fill-words": cAns = tQ.options?.phrase?.map(i => i.value)?.filter((_, idx) => idx % 2 !== 0) ?? []; break; case "text_ai": cAns = { "0": removeHtmlTags(tQ.comment || '') }; break; case "fill-letters": cAns = tQ.options?.answer; break; case "cloud": cAns = tQ.options?.ids; break; default: if(tQ.options){ cAns = Object.fromEntries(Object.keys(tQ.options).filter(oId => tQ.options[oId] !== null && typeof tQ.options[oId] === 'object' && 'answer' in tQ.options[oId]).map(oId => [oId, tQ.options[oId].answer])); } else { cAns = {}; } break; } if (cAns !== null && cAns !== undefined) { nJson.answers[qId] = { question_id: oAns.question_id, question_type: qType, answer: cAns }; } else { console.warn(`Não determinou resp correta q ${qId} (Tipo: ${qType}).`); nJson.answers[qId] = { question_id: oAns.question_id, question_type: qType, answer: (qType === 'text_ai' ? {"0": ""} : (Array.isArray(cAns) ? [] : {})) }; } } catch (error) { console.error(`Erro processar q ${qId} (Tipo: ${qType}):`, error, tQ); sendToast(`Erro processar q ${qId}. Ver console.`, 5000, 'error'); nJson.answers[qId] = { question_id: oAns.question_id, question_type: qType, answer: (qType === 'text_ai' ? {"0": ""} : {}) }; } } return nJson; }
    function loadScript(url) { /* ...definição da função como antes ... */ return new Promise((res, rej) => { if (document.querySelector(`script[src="${url}"]`)) { res(); return; } const s = document.createElement('script'); s.src = url; s.async = true; s.onload = res; s.onerror = (e) => rej(new Error(`Falha script: ${url}. Ev: ${e.type}`)); document.head.appendChild(s); }); }
    async function loadCss(url) { /* ...definição da função como antes ... */ return new Promise((res, rej) => { if (document.querySelector(`link[href="${url}"]`)) { res(); return; } const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = url; l.onload = res; l.onerror = (e) => rej(new Error(`Falha CSS: ${url}. Ev: ${e.type}`)); document.head.appendChild(l); }); }
    async function pegarRespostas(answerId, taskId) { /* ...definição da função como antes ... */ const url = `${API_BASE_URL}/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`; console.log("Buscando resp de:", url); try { const r = await fetch(url, { method: "GET", headers: HEADERS_TEMPLATE }); if (!r.ok) { let eTxt = ''; try { eTxt = await r.text(); } catch (e) {} throw new Error(`HTTP ${r.status}: ${r.statusText}. URL: ${url}. Det: ${eTxt}`); } const d = await r.json(); if (!d || !d.task || !d.task.questions) { console.warn("Dados API incompletos:", d); throw new Error("Resp API ok, dados (task.questions) faltando."); } console.log("Respostas recebidas:", d); return d; } catch (error) { console.error('Erro buscar resp:', error); sendToast(`Erro buscar resp: ${error.message}`, 6000, 'error'); throw error; } }
    async function responderCorretamente(payload, answerId, taskId) { /* ...definição da função como antes ... */ const url = `${API_BASE_URL}/tms/task/${taskId}/answer/${answerId}`; console.log("Enviando resp para:", url); try { const r = await fetch(url, { method: "PUT", headers: HEADERS_TEMPLATE, body: JSON.stringify(payload) }); if (!r.ok) { let eTxt = ''; try { eTxt = await r.text(); } catch (e) {} throw new Error(`HTTP ${r.status}: ${r.statusText}. URL: ${url}. Det: ${eTxt}`); } console.log("Resp enviadas OK."); } catch (error) { console.error('Erro enviar resp:', error); sendToast(`Erro enviar resp: ${error.message}`, 6000, 'error'); throw error; } }
    async function fetchAndResubmit(answerId, taskId) { /* ...definição da função como antes ... */ if (!answerId || !taskId) { console.error("ID inválido.", { answerId, taskId }); sendToast("Erro: ID Resp/Tarefa inválido.", 5000, 'error'); return; } try { sendToast(`Buscando resp (Tarefa ${taskId})...`, 3000, 'info'); const orig = await pegarRespostas(answerId, taskId); sendToast("Processando resp...", 2000, 'info'); const payload = transformJson(orig); sendToast("Enviando correção...", 3000, 'info'); await responderCorretamente(payload, answerId, taskId); sendToast("Tarefa corrigida!", 5000, 'success'); console.log("Correção OK."); } catch (error) { console.error('Falha na correção:', error); sendToast('Falha na correção. Ver console.', 6000, 'error'); } }

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
                responsePromise.then(async (response) => { /* ...lógica de interceptação como antes ... */ const cl = response.clone(); try { if (!response.ok) { console.warn(`Submissão original falhou: ${response.status}`); return; } const data = await cl.json(); console.log("Resp submissão original:", data); if (data && data.id && data.task_id && data.status !== "draft") { sendToast("Submissão detectada! Corrigindo...", 3000, 'info'); setTimeout(() => { fetchAndResubmit(data.id, data.task_id).catch(err => { console.error("Erro não capturado correção:", err); sendToast("Erro inesperado correção.", 5000, 'error'); }); }, 100); } else if (data && data.status === "draft") { console.log("Submissão salva como rascunho."); } else { console.warn("Resp submissão sem dados/status inválido:", data); } } catch (err) { console.error('Erro processar JSON submissão:', err); try { const txt = await cl.text(); console.error("Corpo resp (texto):", txt); sendToast('Erro ler resp submissão. Ver console.', 5000, 'error'); } catch (textErr) { console.error("Não foi possível ler resp (JSON/texto).", textErr); sendToast('Erro crítico processar resp submissão.', 5000, 'error'); } } }).catch(netErr => { console.error("Erro rede submissão interceptada:", netErr); sendToast(`Erro rede submissão: ${netErr.message}`, 5000, 'error'); });
            }
            return responsePromise;
        };
        window.fetch.isCustomInterceptor = true;
        console.log("Interceptor de fetch configurado.");
    }

    // --- Função Principal de Inicialização (Chamada APÓS login detectado) ---
    async function initializeCoreLogic() {
        console.log(`Login detectado com token: ${AUTH_TOKEN ? '...' + AUTH_TOKEN.slice(-6) : 'ERRO'}. Inicializando script...`);

        // Configura Headers agora que temos o token
        HEADERS_TEMPLATE = {
            "x-api-realm": "edusp",
            "x-api-platform": "webclient",
            "x-api-key": AUTH_TOKEN,
            "content-type": "application/json"
        };

        // Verifica a URL (opcional, mas útil)
        if (!TARGET_URL_REGEX.test(document.location.href)) {
            console.warn("Script executado fora da URL alvo esperada:", document.location.href);
            sendToast('Aviso: Script parece estar fora da página de resultado.', 4000, 'warning');
        }

        try {
            sendToast("Carregando recursos...", 2000, 'info');
            await loadCss(TOASTIFY_CSS_URL);
            await loadScript(TOASTIFY_JS_URL);
            toastifyLoaded = true; // Marca que Toastify pode ser usado com segurança
            console.log("Toastify carregado.");
            sendToast("Pronto! Monitorando envios de tarefa...", 3000, 'success');
            setupFetchInterceptor();
        } catch (error) {
            console.error('Falha ao carregar dependências (Toastify):', error);
            alert(`Erro: Não foi possível carregar recursos (${error.message}). Notificações visuais podem falhar.`);
            toastifyLoaded = false; // Garante que o fallback seja usado
            // Tenta continuar mesmo sem Toastify visual
            console.warn("Tentando configurar interceptor sem Toastify...");
            try {
                setupFetchInterceptor();
                alert("Monitoramento iniciado, mas notificações visuais desativadas (erro).");
            } catch (setupError) {
                console.error("Falha configurar interceptor pós erro Toastify:", setupError);
                alert("Erro crítico iniciar monitoramento. Ver console.");
            }
        }
    }

    // --- Loop de Verificação de Login ---
    loginCheckInterval = setInterval(function() {
        console.log("Verificando login...");
        // Verifica se _dadosLogin existe e tem a propriedade auth_token
        if (typeof _dadosLogin !== 'undefined' && _dadosLogin && typeof _dadosLogin.auth_token === 'string' && _dadosLogin.auth_token.length > 0) {
            clearInterval(loginCheckInterval); // Para de verificar
            AUTH_TOKEN = _dadosLogin.auth_token; // Armazena o token
            initializeCoreLogic(); // Inicia o script principal
        } else {
            // Verifica se o tempo máximo de espera foi excedido
            const elapsedTime = (Date.now() - waitStartTime) / 1000;
            if (elapsedTime > MAX_WAIT_SECONDS) {
                clearInterval(loginCheckInterval); // Para de verificar
                console.error(`Login não detectado após ${MAX_WAIT_SECONDS} segundos.`);
                alert(`Login não detectado automaticamente.\n\nPor favor, certifique-se de que você está logado na plataforma SaladoFuturo e tente executar o script novamente APÓS estar na página da tarefa.`);
            }
        }
    }, POLLING_INTERVAL_MS); // Repete a verificação a cada X ms

})();
