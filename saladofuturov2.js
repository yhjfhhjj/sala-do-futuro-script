javascript:(function() {
    'use strict';

    // --- VERIFICAÇÃO DE INSTÂNCIA ---
    if (document.getElementById('hck-beta-ui-bookmarklet')) {
        console.warn('[HCK BETA Bookmarklet] Já está em execução.');
        try { document.getElementById('hck-beta-toggle-btn')?.focus(); } catch(e) {}
        return;
    }
    console.log('[HCK BETA Bookmarklet] Iniciando...');

    // --- CONFIGURAÇÃO HCK BETA (Blackbox Only) ---
    const SCRIPT_VERSION = '9.1.1-hck-beta-bb-fix'; // <- Versão com correção
    const API_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 HCK-Beta/${SCRIPT_VERSION}`; // User Agent mais recente
    const CONFIG = {
        BLACKBOX_API_URL: 'https://www.blackbox.ai/api/chat',
        MODELS: [
             { name: 'Blackbox', id: 'blackbox-default', type: 'blackbox' }, // Nome simplificado
             // { name: 'Blackbox Code', id: 'blackbox-code', type: 'blackbox', codeMode: true },
        ],
        TIMEOUT: 35000,
        MAX_RETRIES: 2,
        API_RETRY_DELAY_BASE: 2000,
        API_RATE_LIMIT_DELAY_MULTIPLIER: 4.5,
        TEMPERATURE: 0.25,
        TOP_P: 0.9,
        MAX_OUTPUT_TOKENS: 15,
        NOTIFICATION_TIMEOUT: 5000,
        NOTIFICATION_TIMEOUT_LONG: 9000,
    };

    // --- FILTROS DE IMAGEM (Mantido para UI, mas não usado na API) ---
    const IMAGE_FILTERS = {
        blocked: [ /edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/sala-do-futuro\/(?:assets|icons?|logos?|buttons?|banners?)\//i, /s3\.sa-east-1\.amazonaws\.com\/edusp-static\.ip\.tv\/room\/cards\//i, /conteudo_logo\.png$/i, /logo_sala_do_futuro\.png$/i, /_thumb(?:nail)?\./i, /\.svg$/i ],
        allowed: [ /edusp-static\.ip\.tv\/(?:tms|tarefas|exercicios)\//i, /\/atividade\/\d+\?eExame=true/i, /\.(?:jpg|png|jpeg|gif|webp)$/i, /lh[0-9]+(?:- G*)*\.googleusercontent\.com/i, /\/media\//i, /\/questao_\d+/i, /image\?/i ],
        verify(src) { if (!src || typeof src !== 'string' || !src.startsWith('http')) return false; if (this.blocked.some(r => r.test(src))) { logMessage('DEBUG', `Image blocked: ${src.substring(0,80)}...`); return false; } if (this.allowed.some(r => r.test(src))) { logMessage('DEBUG', `Image allowed: ${src.substring(0,80)}...`); return true; } logMessage('DEBUG', `Image implicitly blocked: ${src.substring(0,80)}...`); return false; }
    };

    // --- ESTADO GLOBAL ---
    const STATE = {
        isAnalyzing: false,
        images: [],
        logMessages: [],
        logModal: null,
        notificationContainer: null,
        rateLimitActive: false,
        rateLimitTimeoutId: null,
        selectedModelId: CONFIG.MODELS[0]?.id || null
    };

    // --- **CORREÇÃO:** DEFINIÇÃO DE ESTILO GLOBAL (DENTRO DO IIFE) ---
    const estilo = {
        cores: {
            fundo: '#1A1B1E', fundoSecundario: '#2A2B2E', fundoTerciario: '#3A3B3E',
            texto: '#EAEAEA', textoSecundario: '#9A9A9E',
            accent: '#000000', accentBg: '#57FFC1',
            secondaryAccent: '#EAEAEA', secondaryAccentBg: '#3A3B3E',
            erro: '#FF5F57', sucesso: '#57FFC1', warn: '#FFBD2E', info: '#5AC8FA',
            logDebug: '#8A8A8E', borda: '#4A4B4E',
            notificationBg: 'rgba(32, 33, 36, 0.9)', copyBtnBg: '#555555',
            spinner: '#57FFC1' // Cor do spinner
        },
        sombras: { menu: '0 12px 40px rgba(0, 0, 0, 0.5)', botao: '0 3px 6px rgba(0, 0, 0, 0.3)', notification: '0 6px 25px rgba(0, 0, 0, 0.4)' },
        radius: '12px', radiusSmall: '7px'
    };
    // Função auxiliar para gerar UUID (com fallback)
    const generateUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `fallback-${Date.now()}-${Math.random().toString(16).substring(2)}`;

    // --- LOGGING ---
    const logMessage = (level, ...args) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });
        const message = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg); } catch { return '[Object Circular?]'; } }).join(' ');
        STATE.logMessages.push({ timestamp, level, message });
        if (STATE.logMessages.length > 450) { STATE.logMessages.shift(); } // Limite aumentado
        const consoleArgs = [`[HCK ${timestamp}]`, ...args];
        switch(level.toUpperCase()) {
            case 'ERROR': console.error(...consoleArgs); break;
            case 'WARN': console.warn(...consoleArgs); break;
            case 'INFO': console.info(...consoleArgs); break;
            case 'DEBUG': console.debug(...consoleArgs); break;
            default: console.log(...consoleArgs);
        }
        if (STATE.logModal && STATE.logModal.style.display === 'flex') {
            const logArea = STATE.logModal.querySelector('#hck-log-area');
            if (logArea) {
                const color = getLogColor(level);
                const sanitizedMsg = sanitizeHtml(message);
                // Cria o elemento de log e adiciona
                const logEntry = document.createElement('div');
                logEntry.style.marginBottom = '4px';
                logEntry.innerHTML = `<span style="color: ${color}; font-weight: bold; margin-right: 5px;">[${timestamp} ${level}]</span> <span style="color:${getLogColor('TEXT')};">${sanitizedMsg}</span>`;
                logArea.appendChild(logEntry);
                // Rola para o fundo apenas se o usuário não estiver rolando para cima
                if (logArea.scrollHeight - logArea.scrollTop - logArea.clientHeight < 100) {
                   logArea.scrollTop = logArea.scrollHeight;
                }
            }
        }
    };
    const getLogColor = (level) => { // Usa o 'estilo' global
        const cores = { ERROR: estilo.cores.erro, WARN: estilo.cores.warn, INFO: estilo.cores.info, DEBUG: estilo.cores.logDebug, TEXT: estilo.cores.texto, DEFAULT: estilo.cores.textoSecundario };
        return cores[level.toUpperCase()] || cores.DEFAULT;
    };
    const sanitizeHtml = (str) => { const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; };

    // --- FUNÇÕES DE REDE (Timeout/Retry) ---
    const withTimeout = (promise, ms) => Promise.race([ promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)) ]);
    async function fetchWithRetry(modelName, apiType, callback, retries = CONFIG.MAX_RETRIES) { /* ... (código igual ao anterior) ... */
        logMessage('DEBUG', `[${modelName}/${apiType}] Iniciando fetch/retry (Máx ${retries} tentativas)`);
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                if (STATE.rateLimitActive && attempt === 0) {
                    const initialRateLimitDelay = 1500;
                    logMessage('WARN', `[${modelName}] Rate limit global ativo, delay inicial: ${initialRateLimitDelay}ms`);
                    await new Promise(r => setTimeout(r, initialRateLimitDelay));
                }
                return await withTimeout(callback(), CONFIG.TIMEOUT);

            } catch (error) {
                logMessage('ERROR', `[${modelName}/${apiType}] Tentativa ${attempt + 1}/${retries + 1} falhou: ${error.message}`);
                const isCorsError = error instanceof TypeError && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('networkerror'));
                const isTimeoutError = error.message.toLowerCase().includes('timeout');
                const isAbortError = error.name === 'AbortError';

                if (isCorsError || isTimeoutError || isAbortError || attempt === retries) {
                    if (isCorsError) logMessage('ERROR', `[${modelName}/${apiType}] Falha de Rede/CORS. Verifique o console e a extensão de CORS, se houver.`);
                    else if (isTimeoutError) logMessage('ERROR', `[${modelName}/${apiType}] Timeout (${CONFIG.TIMEOUT}ms) atingido.`);
                    else if (isAbortError) logMessage('ERROR', `[${modelName}/${apiType}] Requisição abortada.`);
                    else logMessage('ERROR', `[${modelName}/${apiType}] Máximo de tentativas atingido. Falhando.`);
                    throw error;
                }

                let delay;
                const isRateLimitError = error.message.includes('429') || error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('too many requests') || error.message.toLowerCase().includes('cloudflare');

                if (isRateLimitError) {
                    if (!STATE.rateLimitActive) {
                        logMessage('WARN', `[${modelName}/${apiType}] Rate limit/Bloqueio (${error.message}) detectado! Ativando backoff global.`);
                        STATE.rateLimitActive = true;
                        if (STATE.rateLimitTimeoutId) clearTimeout(STATE.rateLimitTimeoutId);
                        STATE.rateLimitTimeoutId = setTimeout(() => {
                            logMessage('INFO', 'Backoff global de rate limit desativado automaticamente.');
                            STATE.rateLimitActive = false;
                            STATE.rateLimitTimeoutId = null;
                            if (!STATE.isAnalyzing && document.getElementById('hck-beta-analyze-btn')) {
                                setAnalyzeButtonState(false, false);
                            }
                        }, 60000);
                    }
                    delay = CONFIG.API_RETRY_DELAY_BASE * CONFIG.API_RATE_LIMIT_DELAY_MULTIPLIER * (attempt + 1);
                    logMessage('WARN', `[${modelName}/${apiType}] Rate limit/Bloqueio. Aplicando backoff maior: ${delay}ms`);
                } else {
                    delay = CONFIG.API_RETRY_DELAY_BASE * (attempt + 1);
                    logMessage('INFO', `[${modelName}/${apiType}] Erro recuperável (${error.message}). Tentando novamente em ${delay}ms`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error(`[${modelName}/${apiType}] FetchWithRetry falhou inesperadamente após ${retries + 1} tentativas.`);
    }

    // --- EXTRAÇÃO DE IMAGENS (UI Only) ---
    function extractImages() { /* ... (código igual ao anterior) ... */
        logMessage('DEBUG', "Extraindo URLs de imagem da página (para UI)...");
        const urls = new Set();
        document.querySelectorAll('img[src], [style*="background-image"], [data-image], .card-img-top, .questao-imagem').forEach(el => {
            let src = null;
            try {
                if (el.tagName === 'IMG' && el.src) src = el.src;
                else if (el.dataset.image) src = el.dataset.image;
                else if (el.style.backgroundImage) { const m = el.style.backgroundImage.match(/url\("?(.+?)"?\)/); if (m && m[1]) src = m[1]; }

                if (src) {
                    const absUrl = new URL(src, window.location.href).toString();
                    if (IMAGE_FILTERS.verify(absUrl)) { urls.add(absUrl); }
                }
            } catch (e) { logMessage('WARN', `Erro ao processar URL de imagem: ${src || 'desconhecido'}. ${e.message}`); }
        });
        STATE.images = Array.from(urls).slice(0, 8);
        logMessage('INFO', `Extração concluída. ${STATE.images.length} imagens válidas encontradas (apenas para exibição na UI).`);
        return STATE.images;
    }

    // --- CONSULTA BLACKBOX ---
    async function queryBlackboxInternal(modelInfo, promptPayload) { /* ... (código igual ao anterior, usa API_USER_AGENT) ... */
        const { name: modelName, id: modelId } = modelInfo;
        const apiUrl = CONFIG.BLACKBOX_API_URL;

        logMessage('INFO', `[${modelName}/Blackbox] Consultando API Reversa...`);
        logMessage('DEBUG', `[${modelName}/Blackbox] Payload:`, JSON.stringify(promptPayload).substring(0, 400) + "...");

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://www.blackbox.ai',
            'Referer': 'https://www.blackbox.ai/',
            'User-Agent': API_USER_AGENT // <- Usa constante
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(promptPayload),
                mode: 'cors',
                credentials: 'omit'
            });

            logMessage('DEBUG', `[${modelName}/Blackbox] Status Resposta: ${response.status}`);
            const responseBody = await response.text();

            if (!response.ok) {
                 logMessage('ERROR', `[${modelName}/Blackbox] Erro HTTP API ${response.status}: ${response.statusText}. Corpo: ${responseBody.substring(0, 500)}`);
                 if (response.status === 403 || response.status === 503 || responseBody.toLowerCase().includes('cloudflare')) { throw new Error(`API Blocked (Possibly Cloudflare ${response.status})`); }
                 if (response.status === 429) { throw new Error(`API Rate Limit (429)`); }
                 throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }

            logMessage('DEBUG', `[${modelName}/Blackbox] Corpo Resposta Bruta: ${responseBody.substring(0, 500)}...`);
            const answerMatch = responseBody.match(/\$ANSWER\$(.*)/);
            if (answerMatch && answerMatch[1]) {
                const extractedAnswer = answerMatch[1].trim();
                logMessage('INFO', `[${modelName}/Blackbox] Resposta extraída ($ANSWER$): "${extractedAnswer}"`);
                return extractedAnswer;
            }

            const lines = responseBody.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length > 0) {
                 const lastLine = lines[lines.length - 1];
                 try {
                     const jsonResponse = JSON.parse(lastLine);
                     if (jsonResponse && typeof jsonResponse === 'string') {
                         logMessage('INFO', `[${modelName}/Blackbox] Resposta extraída (JSON string última linha): "${jsonResponse}"`);
                         return jsonResponse;
                     }
                 } catch (e) {/* Não é JSON */}
                 logMessage('INFO', `[${modelName}/Blackbox] Resposta extraída (última linha texto): "${lastLine}"`);
                 return lastLine;
            }
            logMessage('WARN', `[${modelName}/Blackbox] Não foi possível extrair resposta estruturada. Retornando corpo inteiro.`);
            return responseBody;

        } catch (error) {
             if (error instanceof TypeError && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('networkerror'))) {
                 logMessage('ERROR', `[${modelName}/Blackbox] Erro Fetch/CORS API: ${error.message}. Certifique-se de que uma extensão de CORS esteja ativa, se necessário.`);
                 throw new Error(`Falha Fetch/CORS API: ${error.message}`);
             }
            logMessage('ERROR', `[${modelName}/Blackbox] Falha Requisição/Processamento: ${error.message}`);
            throw error;
        }
    }

    // --- FORMATAÇÃO DA RESPOSTA (A-E) ---
    function formatResponse(answer) { /* ... (código igual ao anterior) ... */
        if (typeof answer !== 'string') return null;
        const cleaned = answer.trim().replace(/[\*`"']/g, ''); // Limpa básico

        let match = cleaned.match(/^(?:[\[\("]*)([A-E])(?:[\.\)\]"]*)$/i); // Letra isolada A-E (inicio/fim com opcional .()[]")
        if (match && match[1]) { logMessage('DEBUG', `Formatando "${answer}" -> Letra isolada: "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); }

        match = cleaned.match(/(?:alternativa|letra|opção|resposta(?: correta)? é)\s*:?\s*([A-E])(?:\b|[.\)])/i); // "Alternativa X", "Letra X", etc.
        if (match && match[1]) { logMessage('DEBUG', `Formatando "${answer}" -> Padrão 'Alternativa X': "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); }

        if (cleaned.length <= 5) { // String curta, procura A-E isolado
            match = cleaned.match(/(?:^|\s)([A-E])(?:$|\s)/);
            if (match && match[1]) { logMessage('DEBUG', `Formatando "${answer}" -> Letra isolada (string curta): "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); }
        }

        match = cleaned.match(/([A-E])/i); // Último recurso: primeira letra A-E encontrada
        if (match && match[1]) { logMessage('DEBUG', `Formatando "${answer}" -> Primeira letra A-E encontrada: "${match[1].toUpperCase()}"`); return match[1].toUpperCase(); }

        logMessage('WARN', `Falha ao formatar resposta: "${answer}". Não corresponde ao formato A-E esperado.`);
        return null;
    }

    // --- CONSTRUÇÃO DO PROMPT (Blackbox) ---
    async function buildPrompt(question, imageUrls, modelInfo) { /* ... (código igual ao anterior, usa generateUUID) ... */
        logMessage('INFO', `Construindo prompt para ${modelInfo.name}...`);
        let imageWarning = '';
        if (imageUrls.length > 0) {
            imageWarning = '\n(AVISO: Imagens detectadas na página NÃO foram enviadas para análise.)\n';
            logMessage('WARN', 'Imagens detectadas, mas NÃO serão incluídas na chamada da API Blackbox.');
        }

        const promptText = `CONTEXTO: Questão de múltipla escolha (Alternativas A, B, C, D, E).
OBJETIVO: Identificar a ÚNICA alternativa CORRETA.
INSTRUÇÕES IMPORTANTES:
1. Analise APENAS o texto da questão fornecida abaixo.
2. Retorne APENAS e SOMENTE a LETRA MAIÚSCULA da alternativa correta (A, B, C, D ou E).
3. FORMATO ESTRITO: Sua resposta DEVE ser UMA ÚNICA LETRA MAIÚSCULA. NADA MAIS. Sem explicações, sem pontuação, sem frases.

QUESTÃO:
${question}
${imageWarning}`;

        logMessage('DEBUG', "Texto do prompt gerado para Blackbox.");

        const payload = {
            messages: [{ id: generateUUID(), content: promptText, role: "user" }],
            // id: generateUUID(), // Chat ID - Opcional, API parece aceitar sem
            userId: generateUUID(), // User ID - Parece necessário
            codeModelMode: modelInfo.codeMode === true,
            agentMode: {}, trendingAgentMode: {},
            isMicMode: false, isChromeExt: false, githubToken: null,
        };
        return payload;
    }

    // --- SETUP UI (HCK BETA Style) ---
    function setupUI() { // Usa o 'estilo' global
        logMessage('INFO','Configurando UI (HCK BETA Bookmarklet)...');
        try {
            const fontLink = document.createElement('link'); fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap'; fontLink.rel = 'stylesheet'; document.head.appendChild(fontLink);
        } catch (e) { logMessage('WARN', 'Falha ao injetar Google Font. Usando fontes do sistema.'); }

        // A constante 'estilo' foi movida para fora desta função

        const getResponsiveSize = () => ({ menuWidth: (window.innerWidth < 768 ? '210px' : '230px'), fontSize: (window.innerWidth < 768 ? '13px' : '14px'), buttonPadding: '10px 12px', textareaHeight: '50px', titleSize: '17px' });
        const container = document.createElement('div'); container.id = 'hck-beta-ui-bookmarklet';
        container.style.cssText = ` position: fixed; bottom: 15px; right: 15px; z-index: 10000; font-family: 'Inter', sans-serif; line-height: 1.45; `;
        const toggleBtn = document.createElement('button'); toggleBtn.id = 'hck-beta-toggle-btn';
        toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${estilo.cores.accentBg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
        toggleBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; border: 1.5px solid ${estilo.cores.borda}; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; box-shadow: ${estilo.sombras.botao}; display: flex; align-items: center; justify-content: center; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); &:hover { background: ${estilo.cores.fundoTerciario}; border-color: ${estilo.cores.accentBg}; transform: scale(1.05); } `;
        const sizes = getResponsiveSize();
        const menu = document.createElement('div'); menu.id = 'hck-beta-menu';
        menu.style.cssText = ` background: ${estilo.cores.fundo}; width: ${sizes.menuWidth}; padding: 12px; border-radius: ${estilo.radius}; box-shadow: ${estilo.sombras.menu}; display: none; flex-direction: column; gap: 10px; border: 1px solid ${estilo.cores.borda}; opacity: 0; transform: translateY(20px) scale(0.9); transition: opacity 0.35s ease-out, transform 0.35s ease-out; position: relative; margin-bottom: 10px; max-height: 80vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 3px; } `;
        const header = document.createElement('div'); header.style.cssText = `display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 5px;`;
        const title = document.createElement('div'); title.textContent = 'HCK β'; title.style.cssText = ` font-size: ${sizes.titleSize}; font-weight: 600; text-align: left; color: ${estilo.cores.accentBg}; font-family: 'Roboto Mono', monospace; letter-spacing: 1px; `;
        const closeBtn = document.createElement('button'); closeBtn.innerHTML = '×'; closeBtn.setAttribute('aria-label', 'Fechar Menu'); closeBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 20px; font-weight: 500; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; &:hover { background-color: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `;
        header.append(title, closeBtn);

        const modelSelectorContainer = document.createElement('div'); /* ... (código igual) ... */
        modelSelectorContainer.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
        const modelLabel = document.createElement('label'); modelLabel.textContent = 'Modelo:'; // Label mais curto
        modelLabel.style.cssText = `font-size: calc(${sizes.fontSize} - 2px); color: ${estilo.cores.textoSecundario}; font-weight: 500;`;
        const modelSelect = document.createElement('select'); modelSelect.id = 'hck-beta-model-select'; /* ... (estilos iguais) ... */
        modelSelect.style.cssText = ` width: 100%; padding: 6px 8px; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; font-size: calc(${sizes.fontSize} - 1px); font-family: inherit; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${estilo.cores.textoSecundario.substring(1)}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 8px center; background-size: 10px auto; padding-right: 25px; cursor: pointer; &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; }`;
        CONFIG.MODELS.forEach(model => { /* ... (código igual) ... */
            if (model.type === 'blackbox') { const option = document.createElement('option'); option.value = model.id; option.textContent = model.name; modelSelect.appendChild(option); } });
        modelSelect.value = STATE.selectedModelId; modelSelect.addEventListener('change', (e) => { /* ... (código igual) ... */
            STATE.selectedModelId = e.target.value; logMessage('INFO', `Modelo selecionado: ${STATE.selectedModelId}`); const selectedModel = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId); document.getElementById('hck-beta-analyze-btn').textContent = `Analisar (${selectedModel?.name || '?'})`; });
        modelSelectorContainer.append(modelLabel, modelSelect);

        const input = document.createElement('textarea'); input.id = 'hck-beta-question-input'; input.placeholder = 'Cole a questão aqui...'; input.setAttribute('rows', '3'); /* ... (estilos iguais) ... */
        input.style.cssText = ` width: 100%; min-height: ${sizes.textareaHeight}; padding: 10px; margin-bottom: 0; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; resize: vertical; font-size: ${sizes.fontSize}; font-family: inherit; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; transition: border-color 0.2s ease, box-shadow 0.2s ease; &::placeholder {color: ${estilo.cores.textoSecundario};} &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; } `;
        const imagesContainer = document.createElement('div'); imagesContainer.id = 'hck-beta-images-container'; /* ... (estilos e innerHTML inicial iguais) ... */
        imagesContainer.style.cssText = ` max-height: 70px; overflow-y: auto; margin-bottom: 0; font-size: calc(${sizes.fontSize} - 2px); border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; padding: 6px 10px; background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundoSecundario}; &::-webkit-scrollbar { width: 5px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 2px; }`; imagesContainer.innerHTML = `<div style="text-align: center; padding: 3px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem detectada (ou não relevante para análise)</div>`;

        const buttonBaseStyle = ` width: 100%; padding: ${sizes.buttonPadding}; border: none; border-radius: ${estilo.radiusSmall}; cursor: pointer; font-size: ${sizes.fontSize}; font-weight: 500; margin-bottom: 0; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.25s ease; `;
        const buttonPrimaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.accentBg}; color: ${estilo.cores.accent}; font-weight: 600; &:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 4px 8px rgba(87, 255, 193, 0.2); } &:disabled { background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; opacity: 0.6; cursor: not-allowed; box-shadow: none; } `;
        const buttonSecondaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.secondaryAccentBg}; color: ${estilo.cores.secondaryAccent}; border: 1px solid ${estilo.cores.borda}; &:hover { background: ${estilo.cores.fundoTerciario}; border-color: ${estilo.cores.textoSecundario}; } `;
        const updateImagesBtn = document.createElement('button'); updateImagesBtn.textContent = `🔄 Atualizar Imgs (UI)`; updateImagesBtn.style.cssText = buttonSecondaryStyle;
        const analyzeBtn = document.createElement('button'); analyzeBtn.id = 'hck-beta-analyze-btn';
        const selectedModelOnLoad = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId);
        analyzeBtn.textContent = `Analisar (${selectedModelOnLoad?.name || '?'})`; // Nome mais curto
        analyzeBtn.style.cssText = buttonPrimaryStyle;
        const clearBtn = document.createElement('button'); clearBtn.textContent = `🗑️ Limpar`; clearBtn.style.cssText = buttonSecondaryStyle;
        const logsBtn = document.createElement('button'); logsBtn.textContent = `📄 Logs`; logsBtn.style.cssText = buttonSecondaryStyle;
        const credits = document.createElement('div'); /* ... (código igual) ... */
        credits.innerHTML = `<span style="font-weight: 600; letter-spacing: 0.5px; color: ${estilo.cores.textoSecundario};">v${SCRIPT_VERSION}</span> <span style="margin: 0 4px; color: ${estilo.cores.borda};">|</span> <span style="opacity: 0.7; color: ${estilo.cores.textoSecundario};">by Hackermoon</span>`;
        credits.style.cssText = ` text-align: center; font-size: 10px; font-weight: 500; margin-top: 10px; padding-top: 8px; border-top: 1px solid ${estilo.cores.borda}; opacity: 0.8; `;
        const notificationContainer = document.createElement('div'); notificationContainer.id = 'hck-beta-notifications'; /* ... (estilos iguais) ... */
        notificationContainer.style.cssText = ` position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10002; display: flex; flex-direction: column; align-items: center; gap: 12px; width: auto; max-width: 90%; `;
        STATE.notificationContainer = notificationContainer;
        menu.append(header, modelSelectorContainer, input, updateImagesBtn, imagesContainer, analyzeBtn, clearBtn, logsBtn, credits);
        container.append(menu, toggleBtn);
        document.body.appendChild(container); document.body.appendChild(notificationContainer);
        logMessage('INFO', 'Elementos da UI HCK BETA adicionados à página.');

        const toggleMenu = (show) => { /* ... (código igual) ... */
            const duration = 350; if (show) { logMessage('DEBUG', 'Mostrando menu...'); menu.style.display = 'flex'; toggleBtn.style.opacity = '0'; toggleBtn.style.transform = 'scale(0.8) translateY(10px)'; setTimeout(() => { menu.style.opacity = '1'; menu.style.transform = 'translateY(0) scale(1)'; toggleBtn.style.display = 'none'; }, 10); } else { logMessage('DEBUG', 'Escondendo menu...'); menu.style.opacity = '0'; menu.style.transform = 'translateY(20px) scale(0.9)'; setTimeout(() => { menu.style.display = 'none'; toggleBtn.style.display = 'flex'; requestAnimationFrame(() => { toggleBtn.style.opacity = '1'; toggleBtn.style.transform = 'scale(1) translateY(0)'; }); }, duration); } };
        toggleBtn.addEventListener('click', () => toggleMenu(true)); closeBtn.addEventListener('click', () => toggleMenu(false));
        const hideLogs = () => { /* ... (código igual) ... */
            if (STATE.logModal) { STATE.logModal.style.opacity = '0'; STATE.logModal.querySelector('div').style.transform = 'scale(0.95)'; setTimeout(() => STATE.logModal.style.display = 'none', 300); logMessage('DEBUG', 'Escondendo logs.'); } };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (menu.style.display === 'flex') toggleMenu(false); if (STATE.logModal?.style.display !== 'none') hideLogs(); } });
        window.addEventListener('resize', () => { /* ... (código igual) ... */
             const s = getResponsiveSize(); menu.style.width = s.menuWidth; input.style.minHeight = s.textareaHeight; input.style.fontSize = s.fontSize; [analyzeBtn, clearBtn, updateImagesBtn, logsBtn].forEach(b => { b.style.fontSize = s.fontSize; b.style.padding = s.buttonPadding; }); imagesContainer.style.fontSize = `calc(${s.fontSize} - 2px)`; title.style.fontSize = s.titleSize; modelSelect.style.fontSize = `calc(${s.fontSize} - 1px)`; modelLabel.style.fontSize = `calc(${s.fontSize} - 2px)`;});

        const updateImageButtons = (images) => { /* ... (código igual) ... */
            if (!imagesContainer) return; if (images.length === 0) { imagesContainer.innerHTML = `<div style="text-align: center; padding: 3px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem relevante detectada</div>`; return; } imagesContainer.innerHTML = images.map((img, i) => ` <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid ${estilo.cores.borda}; gap: 5px; &:last-child {border-bottom: none;}"> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; color: ${estilo.cores.texto}; font-size:0.9em;" title="${img}">Imagem ${i + 1}</span> <button data-url="${img}" title="Copiar URL" style="background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.textoSecundario}; border: none; border-radius: 4px; padding: 2px 5px; font-size: 10px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; &:hover{color: ${estilo.cores.texto}; background: ${estilo.cores.borda}}">Copiar</button> </div> `).join(''); imagesContainer.querySelectorAll('button[data-url]').forEach(b => { b.addEventListener('click', (e) => { navigator.clipboard.writeText(e.target.dataset.url).then(() => { e.target.textContent = 'Copiado!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1200); }).catch(err => { logMessage('ERROR', 'Falha ao copiar URL:', err); e.target.textContent = 'Falha!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1500); }); }); }); };

        const showResponse = (result, duration) => { /* ... (código igual, usa 'estilo' global) ... */
            if (!STATE.notificationContainer) { logMessage('ERROR', "Container de notificação não encontrado!"); return; } const { answer = "Info", detail = "", type = 'info' } = result || {}; let icon = 'ℹ️'; let titleText = answer; let detailText = detail; let effectiveDuration = duration || (type === 'error' || type === 'warn' ? CONFIG.NOTIFICATION_TIMEOUT_LONG : CONFIG.NOTIFICATION_TIMEOUT); let bgColor = estilo.cores.notificationBg; let titleColor = estilo.cores.texto; switch (type) { case 'success': icon = '✅'; titleColor = estilo.cores.sucesso; break; case 'error': icon = '❌'; titleColor = estilo.cores.erro; break; case 'warn': icon = '⚠️'; titleColor = estilo.cores.warn; break; case 'info': icon = 'ℹ️'; titleColor = estilo.cores.info; break; } const notification = document.createElement('div'); notification.style.cssText = ` background-color: ${bgColor}; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: ${estilo.cores.texto}; padding: 12px 18px; border-radius: ${estilo.radiusSmall}; box-shadow: ${estilo.sombras.notification}; display: flex; align-items: center; gap: 12px; min-width: 200px; max-width: 350px; opacity: 0; transform: translateY(20px); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid ${estilo.cores.borda}; cursor: pointer; `; const iconSpan = document.createElement('span'); iconSpan.textContent = icon; iconSpan.style.fontSize = '1.3em'; const textContent = document.createElement('div'); textContent.style.cssText = `flex-grow: 1; font-size: 0.98em; line-height: 1.35; word-break: break-word;`; textContent.innerHTML = `<span style="font-weight: 600; color: ${titleColor};">${titleText}</span> ${detailText ? `<span style="font-size: 0.9em; color: ${estilo.cores.textoSecundario}; margin-left: 4px; display: inline-block;">${detailText}</span>` : ''}`; let dismissTimeout; const dismiss = () => { clearTimeout(dismissTimeout); notification.style.opacity = '0'; notification.style.transform = 'translateY(25px) scale(0.95)'; setTimeout(() => notification.remove(), 400); }; notification.onclick = dismiss; notification.append(iconSpan, textContent); STATE.notificationContainer.appendChild(notification); requestAnimationFrame(() => { notification.style.opacity = '1'; notification.style.transform = 'translateY(0)'; }); dismissTimeout = setTimeout(dismiss, effectiveDuration); logMessage('INFO', `Notificação (${type} - ${effectiveDuration}ms): ${titleText} ${detailText}`); };

        const createLogModal = () => { /* ... (código igual, usa 'estilo' global) ... */
            if (STATE.logModal) return; logMessage('DEBUG', 'Criando modal de logs HCK BETA.'); const modal = document.createElement('div'); modal.id = 'hck-log-modal'; modal.style.cssText = ` position: fixed; inset: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 10001; font-family: 'Inter', sans-serif; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); opacity: 0; transition: opacity 0.3s ease-out;`; const modalContent = document.createElement('div'); modalContent.style.cssText = ` background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.texto}; padding: 18px 22px; border-radius: ${estilo.radius}; border: 1px solid ${estilo.cores.borda}; width: 90%; max-width: 850px; height: 80%; max-height: 700px; display: flex; flex-direction: column; box-shadow: ${estilo.sombras.menu}; transform: scale(0.95); transition: transform 0.3s ease-out;`; const modalHeader = document.createElement('div'); modalHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid ${estilo.cores.borda}; padding-bottom: 10px; gap: 15px;`; const modalTitle = document.createElement('h3'); modalTitle.textContent = '📄 Logs Detalhados (HCK BETA)'; modalTitle.style.cssText = `margin: 0; color: ${estilo.cores.texto}; font-weight: 600; font-size: 17px; flex-grow: 1; font-family: 'Roboto Mono', monospace;`; const copyLogBtn = document.createElement('button'); copyLogBtn.textContent = 'Copiar'; copyLogBtn.style.cssText = ` background: ${estilo.cores.copyBtnBg}; color: ${estilo.cores.secondaryAccent}; border: none; font-size: 11px; font-weight: 500; padding: 5px 10px; border-radius: ${estilo.radiusSmall}; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; &:hover { background: ${estilo.cores.borda}; color: ${estilo.cores.texto}; }`; copyLogBtn.onclick = () => { const textToCopy = STATE.logMessages.map(log => `[${log.timestamp} ${log.level}] ${log.message}`).join('\n'); navigator.clipboard.writeText(textToCopy).then(() => { copyLogBtn.textContent = 'Copiado!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar'; }, 2000); logMessage('INFO', 'Logs copiados.'); }).catch(err => { logMessage('ERROR', 'Falha ao copiar logs:', err); copyLogBtn.textContent = 'Erro!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar'; }, 2000); }); }; const closeLogBtn = document.createElement('button'); closeLogBtn.innerHTML = '×'; closeLogBtn.setAttribute('aria-label', 'Fechar Logs'); closeLogBtn.style.cssText = ` background: ${estilo.cores.fundoTerciario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 20px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 26px; height: 26px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease; flex-shrink: 0; &:hover { background-color: ${estilo.cores.borda}; color: ${estilo.cores.texto}; } `; closeLogBtn.onclick = hideLogs; modalHeader.append(modalTitle, copyLogBtn, closeLogBtn); const logArea = document.createElement('div'); logArea.id = 'hck-log-area'; logArea.style.cssText = ` flex-grow: 1; overflow-y: auto; font-size: 11.5px; line-height: 1.65; background-color: ${estilo.cores.fundo}; border-radius: ${estilo.radiusSmall}; padding: 12px; border: 1px solid ${estilo.cores.borda}; white-space: pre-wrap; word-wrap: break-word; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; font-family: 'Roboto Mono', monospace; &::-webkit-scrollbar { width: 7px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 3px; } `; modalContent.append(modalHeader, logArea); modal.appendChild(modalContent); document.body.appendChild(modal); STATE.logModal = modal; };
        const showLogs = () => { /* ... (código igual, usa 'estilo' global) ... */
            logMessage('DEBUG', 'showLogs chamado.'); if (!STATE.logModal) createLogModal(); const logArea = STATE.logModal?.querySelector('#hck-log-area'); if (!logArea || !STATE.logModal) { logMessage('ERROR', 'Modal ou área de log não encontrada.'); return; } logMessage('INFO', `Exibindo ${STATE.logMessages.length} logs.`); logArea.innerHTML = STATE.logMessages.map(log => { const color = getLogColor(log.level); const sanitizedMsg = sanitizeHtml(log.message); return `<div style="margin-bottom: 4px;"><span style="color: ${color}; font-weight: bold; margin-right: 5px;">[${log.timestamp} ${log.level}]</span> <span style="color:${getLogColor('TEXT')};">${sanitizedMsg}</span></div>`; }).join(''); STATE.logModal.style.display = 'flex'; requestAnimationFrame(() => { STATE.logModal.style.opacity = '1'; STATE.logModal.querySelector('div').style.transform = 'scale(1)'; }); logArea.scrollTop = logArea.scrollHeight; };
        logsBtn.addEventListener('click', showLogs);

        return { elements: { input, analyzeBtn, clearBtn, updateImagesBtn, logsBtn, imagesContainer, toggleBtn, modelSelect }, helpers: { updateImageButtons, showResponse, toggleMenu, showLogs, hideLogs } };
    }

    // --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
    function init() {
        logMessage('INFO',`----- HCK BETA Bookmarklet Inicializando (v${SCRIPT_VERSION} - Blackbox Only) -----`);
        try {
            const ui = setupUI(); // setupUI agora usa o 'estilo' global
            if (!ui) throw new Error("Falha crítica na configuração da UI HCK BETA.");
            logMessage('INFO','Configuração da UI completa.');

            const { input, analyzeBtn, clearBtn, updateImagesBtn, toggleBtn, modelSelect } = ui.elements;
            const { updateImageButtons, showResponse } = ui.helpers;

            // Define a função globalmente (ou no escopo do IIFE) para que possa ser chamada por timeouts
            window.setAnalyzeButtonState = (analyzing, rateLimited = false) => {
                 const currentBtn = document.getElementById('hck-beta-analyze-btn');
                 const currentToggleBtn = document.getElementById('hck-beta-toggle-btn');
                 const currentModelSelect = document.getElementById('hck-beta-model-select');
                 if (!currentBtn) return;

                 const selectedModel = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId);
                 const btnBaseText = `Analisar (${selectedModel?.name || '?'})`;

                 currentBtn.disabled = analyzing || rateLimited;
                 if(currentModelSelect) currentModelSelect.disabled = analyzing || rateLimited;

                 if (rateLimited) {
                     currentBtn.textContent = `Limite Atingido...`;
                     currentBtn.style.backgroundColor = estilo.cores.erro; // Usa 'estilo' global
                     currentBtn.style.color = '#FFFFFF';
                     if(currentToggleBtn) currentToggleBtn.style.borderColor = estilo.cores.erro; // Usa 'estilo' global
                 } else if (analyzing) {
                     // Spinner SVG melhorado
                     currentBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="${estilo.cores.accent}" style="margin-right: 8px;"><path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z" opacity=".5"/><path d="M12 4a8 8 0 0 1 8 8 .75.75 0 0 1-1.5 0A6.5 6.5 0 1 0 12 18.5a.75.75 0 0 1 0 1.5A8 8 0 0 1 12 4Z"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg> Analisando...`;
                     currentBtn.style.backgroundColor = estilo.cores.accentBg; // Usa 'estilo' global
                     currentBtn.style.color = estilo.cores.accent; // Usa 'estilo' global
                     if(currentToggleBtn) currentToggleBtn.style.borderColor = estilo.cores.borda; // Usa 'estilo' global
                 } else {
                     currentBtn.textContent = btnBaseText;
                     currentBtn.style.backgroundColor = estilo.cores.accentBg; // Usa 'estilo' global
                     currentBtn.style.color = estilo.cores.accent; // Usa 'estilo' global
                      if(currentToggleBtn) currentToggleBtn.style.borderColor = estilo.cores.borda; // Usa 'estilo' global
                 }
             };

            // --- AÇÃO DO BOTÃO ANALISAR ---
            analyzeBtn.onclick = async () => { /* ... (lógica interna igual à anterior) ... */
                logMessage('INFO', "----- Botão Analisar Clicado -----");
                const question = input.value.trim();
                const selectedModel = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId);

                if (!selectedModel) { logMessage('ERROR', "Nenhum modelo válido selecionado."); showResponse({answer: "Erro Config", detail: "Nenhum modelo selecionado.", type: 'error' }); return; }
                if (STATE.isAnalyzing) { logMessage('WARN', `Ignorado: Já analisando.`); showResponse({answer: "Aguarde", detail: "Análise em progresso", type: 'warn' }); return; }
                if (STATE.rateLimitActive) { logMessage('WARN', `Ignorado: Rate limit ativo.`); showResponse({answer: "Limite Atingido", detail: "Aguarde e tente novamente.", type: 'error' }); setAnalyzeButtonState(false, true); return; }
                if (!question) { logMessage('WARN', `Ignorado: Questão vazia.`); showResponse({answer: "Erro", detail: "Insira o texto da questão", type: 'error' }); input.focus(); return; }

                STATE.isAnalyzing = true;
                setAnalyzeButtonState(true);
                logMessage("INFO", `Iniciando análise com ${selectedModel.name}...`);
                logMessage("DEBUG", `Questão: ${question.substring(0,150)}...`);

                try {
                    const images = extractImages(); // Apenas para UI
                    updateImageButtons(images);
                    const payload = await buildPrompt(question, images, selectedModel);
                    logMessage('INFO', `Consultando ${selectedModel.name} via fetchWithRetry...`);
                    const result = await fetchWithRetry( selectedModel.name, 'blackbox', () => queryBlackboxInternal(selectedModel, payload) );
                    logMessage('INFO', `Resposta bruta recebida de ${selectedModel.name}. Formatando...`);
                    const formattedAnswer = formatResponse(result);

                    if (formattedAnswer) {
                        logMessage('INFO', `Resposta Final Formatada: ${formattedAnswer}`);
                        showResponse({ answer: formattedAnswer, detail: `(${selectedModel.name})`, type: 'success' });
                    } else {
                        logMessage('WARN', `Não foi possível formatar a resposta: "${result.substring(0,100)}..."`);
                        showResponse({ answer: "Formato?", detail: `Resposta não reconhecida: "${result.substring(0, 30)}..."`, type: 'warn' });
                    }

                } catch (error) {
                    logMessage("ERROR", `Erro crítico durante a análise com ${selectedModel.name}:`, error);
                    let detailMsg = `Falha: ${error.message.substring(0,100)}`;
                     if (error.message.toLowerCase().includes('cors')) { detailMsg = "Falha de Rede/CORS. Verifique console/extensão."; }
                     else if (error.message.toLowerCase().includes('rate limit')) { detailMsg = "Limite de requisições atingido."; setAnalyzeButtonState(false, true); }
                     else if (error.message.toLowerCase().includes('cloudflare')) { detailMsg = "API bloqueada (Cloudflare?). Tente mais tarde."; setAnalyzeButtonState(false, true); }
                    showResponse({ answer: "Erro Análise", detail: detailMsg, type: 'error' });
                } finally {
                    STATE.isAnalyzing = false;
                    setAnalyzeButtonState(false, STATE.rateLimitActive); // Reavalia estado do botão
                    logMessage("INFO", "----- Análise Finalizada -----");
                }
             };

            // --- OUTROS BOTÕES ---
            clearBtn.onclick = () => { /* ... (código igual) ... */
                 logMessage('INFO', "----- Limpar Clicado -----"); input.value = ''; STATE.images = []; updateImageButtons([]); input.focus(); logMessage("INFO", "Campos limpos."); showResponse({answer: "Limpado", type: 'info'}, 3000); };
            updateImagesBtn.onclick = () => { /* ... (código igual) ... */
                 logMessage('INFO', "----- Atualizar Imagens (UI) Clicado -----"); try { extractImages(); updateImageButtons(STATE.images); showResponse({answer:"Imagens (UI) Atualizadas", detail:`${STATE.images.length} detectadas.`, type:'info'}, 3000); } catch (e) { logMessage("ERROR","Erro ao atualizar imagens:",e); showResponse({answer:"Erro Imagens", detail:"Falha leitura.", type:'error'}); }};

            // Extração inicial de imagens para a UI
            setTimeout(() => { logMessage("INFO", "Tentativa inicial de extração de imagens (UI)..."); try { extractImages(); updateImageButtons(STATE.images); } catch (e) { logMessage("ERROR", "Erro na extração inicial de imagens:", e); }}, 2000);

            logMessage('INFO',`----- HCK BETA Bookmarklet Inicializado (v${SCRIPT_VERSION} - Blackbox Only) -----`);
            ui.helpers.toggleMenu(true); // Abre o menu ao iniciar

        } catch (error) {
            logMessage('ERROR', '!!! ERRO CRÍTICO NA INICIALIZAÇÃO DO BOOKMARKLET !!!', error);
            console.error(`[HCK BETA Init Fail]: ${error.message}. Script pode não funcionar. Verifique o Console. Stack: ${error.stack || 'N/A'}`);
            alert(`[HCK BETA Bookmarklet Init Fail]: ${error.message}. Verifique o console (F12) para detalhes.`);
            // Tenta remover UI parcialmente criada
            try { document.getElementById('hck-beta-ui-bookmarklet')?.remove(); } catch(e){}
            try { document.getElementById('hck-beta-notifications')?.remove(); } catch(e){}
            try { document.getElementById('hck-log-modal')?.remove(); } catch(e){}
        }
    }

    // --- Executa a inicialização ---
    init();

})();
