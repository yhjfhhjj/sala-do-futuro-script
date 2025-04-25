javascript:(function() {
    'use strict';

    // --- VERIFICAÇÃO DE INSTÂNCIA ---
    if (document.getElementById('hck-beta-ui-bookmarklet')) {
        console.warn('[HCK BETA Bookmarklet] Já está em execução.');
        try {
            document.getElementById('hck-beta-toggle-btn')?.focus();
        } catch(e) {}
        return;
    }
    console.log('[HCK BETA Bookmarklet] Iniciando...');

    // --- CONFIGURAÇÃO HCK BETA (Blackbox Only) ---
    const SCRIPT_VERSION = '9.1.0-hck-beta-bb'; // <- Versão Blackbox
    const CONFIG = {
        // APIs
        BLACKBOX_API_URL: 'https://www.blackbox.ai/api/chat', // <- API Blackbox (Reversa)

        // Modelos Configurados (Apenas Blackbox)
        MODELS: [
             { name: 'Blackbox Default', id: 'blackbox-default', type: 'blackbox' }, // ID genérico, payload pode diferenciar
             // { name: 'Blackbox Code', id: 'blackbox-code', type: 'blackbox', codeMode: true }, // Exemplo se precisar de modo código
        ],
        // Configurações Gerais
        TIMEOUT: 35000, // Aumentado um pouco mais
        MAX_RETRIES: 2,
        API_RETRY_DELAY_BASE: 2000, // Aumentado
        API_RATE_LIMIT_DELAY_MULTIPLIER: 4.5, // Aumentado
        TEMPERATURE: 0.25, // Blackbox pode preferir temp mais baixa para respostas diretas
        TOP_P: 0.9,
        MAX_OUTPUT_TOKENS: 15, // Mantido (Blackbox pode ignorar isso)
        NOTIFICATION_TIMEOUT: 5000,
        NOTIFICATION_TIMEOUT_LONG: 9000,
        // Safety settings não são aplicáveis diretamente ao Blackbox da mesma forma que Gemini
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
        images: [], // Mantido para UI
        // imageCache: {}, // Cache não é mais estritamente necessário sem Gemini, mas pode ficar
        logMessages: [],
        logModal: null,
        notificationContainer: null,
        // Nenhum índice de chave API necessário para Blackbox
        rateLimitActive: false,
        rateLimitTimeoutId: null,
        selectedModelId: CONFIG.MODELS[0]?.id || null // Modelo Blackbox selecionado
    };

    // --- LOGGING (Mantido como na versão anterior) ---
    const logMessage = (level, ...args) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 });
        const message = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg); } catch { return '[Object Circular?]'; } }).join(' ');
        STATE.logMessages.push({ timestamp, level, message });
        if (STATE.logMessages.length > 400) { STATE.logMessages.shift(); }
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
                logArea.innerHTML += `<div style="margin-bottom: 4px;"><span style="color: ${color}; font-weight: bold; margin-right: 5px;">[${timestamp} ${level}]</span> <span style="color:${getLogColor('TEXT')};">${sanitizedMsg}</span></div>`;
                logArea.scrollTop = logArea.scrollHeight;
            }
        }
    };
    const getLogColor = (level) => {
        const cores = { ERROR: '#FF5F57', WARN: '#FFBD2E', INFO: '#57FFC1', DEBUG: '#8A8A8E', TEXT: '#EAEAEA', DEFAULT: '#B0B0B0' };
        return cores[level.toUpperCase()] || cores.DEFAULT;
    };
    const sanitizeHtml = (str) => { const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; };


    // --- FUNÇÕES DE REDE (Com Timeout e Retry) ---
    const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms))
    ]);

    async function fetchWithRetry(modelName, apiType, callback, retries = CONFIG.MAX_RETRIES) {
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
                // Erros comuns que indicam rate limit ou bloqueio temporário
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
                        }, 60000); // Backoff global aumentado para 1 minuto
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

    // --- FUNÇÃO PARA BUSCAR IMAGEM BASE64 (Mantida para UI, mas não usada na API Blackbox) ---
    // async function fetchImageAsBase64(url) { ... } // Código mantido aqui, mas não chamado por buildPrompt para API

    // --- EXTRAÇÃO DE IMAGENS (Mantida para UI) ---
    function extractImages() {
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

    // --- FUNÇÃO DE CONSULTA BLACKBOX ---
    async function queryBlackboxInternal(modelInfo, promptPayload) {
        const { name: modelName, id: modelId } = modelInfo;
        const apiUrl = CONFIG.BLACKBOX_API_URL;

        logMessage('INFO', `[${modelName}/Blackbox] Consultando API Reversa...`);
        // O payload já vem formatado de buildPrompt
        logMessage('DEBUG', `[${modelName}/Blackbox] Payload:`, JSON.stringify(promptPayload).substring(0, 400) + "...");

        // Headers - podem precisar de ajuste fino baseado em como a API reversa funciona
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://www.blackbox.ai',
            'Referer': 'https://www.blackbox.ai/',
            'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 HCK-Beta/${SCRIPT_VERSION}` // User agent mais recente
            // 'Cookie': 'sessionId=...' // A API reversa pode exigir um sessionId válido. Se falhar, investigar isso.
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

            const responseBody = await response.text(); // Ler o corpo como texto

            if (!response.ok) {
                 logMessage('ERROR', `[${modelName}/Blackbox] Erro HTTP API ${response.status}: ${response.statusText}. Corpo: ${responseBody.substring(0, 500)}`);
                 if (response.status === 403 || response.status === 503 || responseBody.toLowerCase().includes('cloudflare')) {
                     throw new Error(`API Blocked (Possibly Cloudflare ${response.status})`);
                 }
                 if (response.status === 429) { throw new Error(`API Rate Limit (429)`); }
                 // Outro erro não tratado especificamente
                 throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }

            // --- Parsing da Resposta Blackbox ---
            // A API reversa frequentemente retorna a resposta completa no final,
            // às vezes dentro de uma estrutura específica como $ANSWER$ ou similar.
            // Tentativa de extrair a resposta final. Isso pode precisar de ajuste!
            logMessage('DEBUG', `[${modelName}/Blackbox] Corpo Resposta Bruta: ${responseBody.substring(0, 500)}...`);

            // Tenta extrair do padrão $ANSWER$ (comum em algumas libs reversas)
            const answerMatch = responseBody.match(/\$ANSWER\$(.*)/);
            if (answerMatch && answerMatch[1]) {
                const extractedAnswer = answerMatch[1].trim();
                logMessage('INFO', `[${modelName}/Blackbox] Resposta extraída ($ANSWER$): "${extractedAnswer}"`);
                return extractedAnswer;
            }

            // Se não encontrar $ANSWER$, tenta pegar a última linha não vazia (pode ser a resposta)
            // Isso é uma heurística e pode falhar.
            const lines = responseBody.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length > 0) {
                 const lastLine = lines[lines.length - 1];
                 // Tenta parsear como JSON, caso a última linha seja um objeto JSON com a resposta
                 try {
                     const jsonResponse = JSON.parse(lastLine);
                     if (jsonResponse && typeof jsonResponse === 'string') { // Se a linha é uma string JSONizada
                         logMessage('INFO', `[${modelName}/Blackbox] Resposta extraída (JSON string última linha): "${jsonResponse}"`);
                         return jsonResponse;
                     }
                     // Adicione aqui lógicas para extrair de campos específicos se o JSON tiver uma estrutura conhecida
                     // ex: if (jsonResponse.choices && jsonResponse.choices[0].text) return jsonResponse.choices[0].text;

                 } catch (e) {/* Não é JSON ou falhou */}

                 // Se não for JSON ou não tiver estrutura esperada, retorna a linha como texto
                 logMessage('INFO', `[${modelName}/Blackbox] Resposta extraída (última linha texto): "${lastLine}"`);
                 return lastLine;
            }

            // Se nada funcionou, retorna o corpo inteiro (pode ser útil para debug)
            logMessage('WARN', `[${modelName}/Blackbox] Não foi possível extrair resposta estruturada. Retornando corpo inteiro.`);
            return responseBody;


        } catch (error) {
             if (error instanceof TypeError && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('networkerror'))) {
                 logMessage('ERROR', `[${modelName}/Blackbox] Erro Fetch/CORS API: ${error.message}. Certifique-se de que uma extensão de CORS esteja ativa, se necessário.`);
                 throw new Error(`Falha Fetch/CORS API: ${error.message}`);
             }
            logMessage('ERROR', `[${modelName}/Blackbox] Falha Requisição/Processamento: ${error.message}`);
            throw error; // Re-lança para fetchWithRetry
        }
    }

    // --- FORMATAÇÃO DA RESPOSTA (A-E) ---
    function formatResponse(answer) {
        if (typeof answer !== 'string') return null;
        const trimmed = answer.trim();

        // Remove markdown comum (negrito, etc.) e aspas
        const cleaned = trimmed.replace(/[\*`"']/g, '');

        // 1. Tenta encontrar letra isolada A-E no início ou fim, opcionalmente com ponto/parênteses
        let match = cleaned.match(/^(?:[\[\("]*)([A-E])(?:[\.\)\]"]*)$/i);
        if (match && match[1]) {
             logMessage('DEBUG', `Formatando "${answer}" -> Letra isolada: "${match[1].toUpperCase()}"`);
             return match[1].toUpperCase();
        }

        // 2. Tenta encontrar "Alternativa X", "Letra X" etc.
        match = cleaned.match(/(?:alternativa|letra|opção|resposta é|correta é)\s*:?\s*([A-E])(?:\b|[.\)])/i);
         if (match && match[1]) {
             logMessage('DEBUG', `Formatando "${answer}" -> Padrão 'Alternativa X': "${match[1].toUpperCase()}"`);
             return match[1].toUpperCase();
         }

        // 3. Tenta encontrar a letra MAIÚSCULA ISOLADA em qualquer lugar da string curta
        //    (Útil se a resposta for apenas "A" ou " B " etc.)
        if (cleaned.length <= 5) {
            match = cleaned.match(/(?:^|\s)([A-E])(?:$|\s)/);
             if (match && match[1]) {
                logMessage('DEBUG', `Formatando "${answer}" -> Letra isolada (string curta): "${match[1].toUpperCase()}"`);
                return match[1].toUpperCase();
            }
        }

        // 4. Como último recurso, pega a primeira letra A-E encontrada
        match = cleaned.match(/([A-E])/i);
        if (match && match[1]) {
            logMessage('DEBUG', `Formatando "${answer}" -> Primeira letra A-E encontrada: "${match[1].toUpperCase()}"`);
            return match[1].toUpperCase();
        }

        logMessage('WARN', `Falha ao formatar resposta: "${answer}". Não corresponde ao formato A-E esperado.`);
        return null; // Não conseguiu formatar
    }


    // --- CONSTRUÇÃO DO PROMPT (Adaptado para Blackbox) ---
    async function buildPrompt(question, imageUrls, modelInfo) {
        logMessage('INFO', `Construindo prompt para ${modelInfo.name}...`);
        // AVISO: Imagens não serão enviadas para Blackbox
        let imageWarning = '';
        if (imageUrls.length > 0) {
            imageWarning = '\n(AVISO: As imagens detectadas na página NÃO foram enviadas para a análise do Blackbox.)\n';
            logMessage('WARN', 'Imagens detectadas, mas NÃO serão incluídas na chamada da API Blackbox.');
        }

        // Prompt direto focado na tarefa
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

        // --- Payload para Blackbox API (/api/chat) ---
        // A estrutura pode variar, baseada na API reversa.
        // Referência: https://github.com/notsopreety/blackbox-api-v2/blob/main/src/blackbox/api.py
        // Tentativa de replicar a estrutura básica.
        const payload = {
            messages: [{
                id: crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`, // ID aleatório para a mensagem
                content: promptText,
                role: "user"
            }],
            // id: crypto.randomUUID ? crypto.randomUUID() : `chat-${Date.now()}-${Math.random()}`, // ID para o chat (pode ser necessário)
            // previewToken: null, // Geralmente null para novos chats
            userId: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random()}`, // User ID aleatório (pode ser necessário)
            codeModelMode: modelInfo.codeMode === true, // Se o modelo for específico para código
            agentMode: {}, // Geralmente vazio
            trendingAgentMode: {}, // Geralmente vazio
            isMicMode: false,
            isChromeExt: false,
            githubToken: null,
            // Adicionar outros campos se a API exigir (ex: temperature, maxTokens, mas Blackbox pode ignorar)
            // model: modelInfo.id // O ID do modelo pode ser necessário aqui dependendo da API
        };

        return payload;
    }

    // --- SETUP UI (Estilo HCK BETA) ---
    function setupUI() {
        logMessage('INFO','Configurando UI (HCK BETA Bookmarklet)...');
        try {
            const fontLink = document.createElement('link'); fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap'; fontLink.rel = 'stylesheet'; document.head.appendChild(fontLink);
        } catch (e) {
            logMessage('WARN', 'Falha ao injetar Google Font. Usando fontes do sistema.');
        }
        // --- NOVO TEMA HCK BETA ---
        const estilo = {
            cores: {
                fundo: '#1A1B1E', // Mais escuro
                fundoSecundario: '#2A2B2E',
                fundoTerciario: '#3A3B3E',
                texto: '#EAEAEA', // Mais claro
                textoSecundario: '#9A9A9E',
                accent: '#000000', // Preto para texto no botão principal
                accentBg: '#57FFC1', // Verde/Ciano HCK
                secondaryAccent: '#EAEAEA',
                secondaryAccentBg: '#3A3B3E', // Botões secundários
                erro: '#FF5F57', // Vermelho macOS
                sucesso: '#57FFC1', // Verde HCK
                warn: '#FFBD2E', // Amarelo macOS
                info: '#5AC8FA', // Azul claro macOS
                logDebug: '#8A8A8E',
                borda: '#4A4B4E', // Borda mais pronunciada
                notificationBg: 'rgba(32, 33, 36, 0.9)', // Fundo notificação mais escuro e opaco
                copyBtnBg: '#555555'
            },
            sombras: {
                menu: '0 12px 40px rgba(0, 0, 0, 0.5)', // Sombra mais forte
                botao: '0 3px 6px rgba(0, 0, 0, 0.3)',
                notification: '0 6px 25px rgba(0, 0, 0, 0.4)'
            },
            radius: '12px', // Um pouco menos arredondado
            radiusSmall: '7px'
        };
        const getResponsiveSize = () => ({ menuWidth: (window.innerWidth < 768 ? '210px' : '230px'), fontSize: (window.innerWidth < 768 ? '13px' : '14px'), buttonPadding: '10px 12px', textareaHeight: '50px', titleSize: '17px' });
        const container = document.createElement('div'); container.id = 'hck-beta-ui-bookmarklet'; // ID Atualizado
        container.style.cssText = ` position: fixed; bottom: 15px; right: 15px; z-index: 10000; font-family: 'Inter', sans-serif; line-height: 1.45; `;
        const toggleBtn = document.createElement('button'); toggleBtn.id = 'hck-beta-toggle-btn'; // ID Atualizado
        // Estilo do botão de toggle - mais chamativo
        toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${estilo.cores.accentBg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`; // Ícone HCK
        toggleBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; border: 1.5px solid ${estilo.cores.borda}; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; box-shadow: ${estilo.sombras.botao}; display: flex; align-items: center; justify-content: center; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); &:hover { background: ${estilo.cores.fundoTerciario}; border-color: ${estilo.cores.accentBg}; transform: scale(1.05); } `;
        const sizes = getResponsiveSize();
        const menu = document.createElement('div'); menu.id = 'hck-beta-menu'; // ID Atualizado
        menu.style.cssText = ` background: ${estilo.cores.fundo}; width: ${sizes.menuWidth}; padding: 12px; border-radius: ${estilo.radius}; box-shadow: ${estilo.sombras.menu}; display: none; flex-direction: column; gap: 10px; border: 1px solid ${estilo.cores.borda}; opacity: 0; transform: translateY(20px) scale(0.9); transition: opacity 0.35s ease-out, transform 0.35s ease-out; position: relative; margin-bottom: 10px; max-height: 80vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 3px; } `;
        const header = document.createElement('div'); header.style.cssText = `display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 5px;`;
        const title = document.createElement('div'); title.textContent = 'HCK β'; title.style.cssText = ` font-size: ${sizes.titleSize}; font-weight: 600; text-align: left; color: ${estilo.cores.accentBg}; font-family: 'Roboto Mono', monospace; letter-spacing: 1px; `;
        const closeBtn = document.createElement('button'); closeBtn.innerHTML = '×'; closeBtn.setAttribute('aria-label', 'Fechar Menu'); closeBtn.style.cssText = ` background: ${estilo.cores.fundoSecundario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 20px; font-weight: 500; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; &:hover { background-color: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; } `;
        header.append(title, closeBtn);

        // --- Seletor de Modelo ---
        const modelSelectorContainer = document.createElement('div');
        modelSelectorContainer.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
        const modelLabel = document.createElement('label');
        modelLabel.textContent = 'Modelo Blackbox:';
        modelLabel.style.cssText = `font-size: calc(${sizes.fontSize} - 2px); color: ${estilo.cores.textoSecundario}; font-weight: 500;`;
        const modelSelect = document.createElement('select');
        modelSelect.id = 'hck-beta-model-select';
        modelSelect.style.cssText = ` width: 100%; padding: 6px 8px; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; font-size: calc(${sizes.fontSize} - 1px); font-family: inherit; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23${estilo.cores.textoSecundario.substring(1)}%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 8px center; background-size: 10px auto; padding-right: 25px; cursor: pointer; &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; }`;
        CONFIG.MODELS.forEach(model => {
            if (model.type === 'blackbox') { // Apenas modelos blackbox
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            }
        });
        modelSelect.value = STATE.selectedModelId; // Define o valor inicial
        modelSelect.addEventListener('change', (e) => {
            STATE.selectedModelId = e.target.value;
            logMessage('INFO', `Modelo selecionado: ${STATE.selectedModelId}`);
            const selectedModel = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId);
            document.getElementById('hck-beta-analyze-btn').textContent = `Analisar (${selectedModel?.name || 'Blackbox'})`;
        });
        modelSelectorContainer.append(modelLabel, modelSelect);

        const input = document.createElement('textarea'); input.id = 'hck-beta-question-input'; input.placeholder = 'Cole a questão aqui...'; input.setAttribute('rows', '3'); // Aumenta um pouco
        input.style.cssText = ` width: 100%; min-height: ${sizes.textareaHeight}; padding: 10px; margin-bottom: 0; border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; resize: vertical; font-size: ${sizes.fontSize}; font-family: inherit; box-sizing: border-box; background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.texto}; transition: border-color 0.2s ease, box-shadow 0.2s ease; &::placeholder {color: ${estilo.cores.textoSecundario};} &:focus { outline: none; border-color: ${estilo.cores.accentBg}; box-shadow: 0 0 0 1px ${estilo.cores.accentBg}80; } `;
        const imagesContainer = document.createElement('div'); imagesContainer.id = 'hck-beta-images-container'; imagesContainer.style.cssText = ` max-height: 70px; overflow-y: auto; margin-bottom: 0; font-size: calc(${sizes.fontSize} - 2px); border: 1px solid ${estilo.cores.borda}; border-radius: ${estilo.radiusSmall}; padding: 6px 10px; background: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundoSecundario}; &::-webkit-scrollbar { width: 5px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 2px; }`; imagesContainer.innerHTML = `<div style="text-align: center; padding: 3px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem detectada (ou não relevante para análise Blackbox)</div>`;

        // --- Botões ---
        const buttonBaseStyle = ` width: 100%; padding: ${sizes.buttonPadding}; border: none; border-radius: ${estilo.radiusSmall}; cursor: pointer; font-size: ${sizes.fontSize}; font-weight: 500; margin-bottom: 0; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.25s ease; `;
        const buttonPrimaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.accentBg}; color: ${estilo.cores.accent}; font-weight: 600; &:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 4px 8px rgba(87, 255, 193, 0.2); } &:disabled { background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.textoSecundario}; opacity: 0.6; cursor: not-allowed; box-shadow: none; } `;
        const buttonSecondaryStyle = ` ${buttonBaseStyle} background: ${estilo.cores.secondaryAccentBg}; color: ${estilo.cores.secondaryAccent}; border: 1px solid ${estilo.cores.borda}; &:hover { background: ${estilo.cores.fundoTerciario}; border-color: ${estilo.cores.textoSecundario}; } `;
        const updateImagesBtn = document.createElement('button'); updateImagesBtn.textContent = `🔄 Atualizar Imagens (UI)`; updateImagesBtn.style.cssText = buttonSecondaryStyle;
        const analyzeBtn = document.createElement('button'); analyzeBtn.id = 'hck-beta-analyze-btn'; // ID Atualizado
        const selectedModel = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId);
        analyzeBtn.textContent = `Analisar (${selectedModel?.name || 'Blackbox'})`;
        analyzeBtn.style.cssText = buttonPrimaryStyle;
        const clearBtn = document.createElement('button'); clearBtn.textContent = `🗑️ Limpar Tudo`; clearBtn.style.cssText = buttonSecondaryStyle;
        const logsBtn = document.createElement('button'); logsBtn.textContent = `📄 Ver Logs`; logsBtn.style.cssText = buttonSecondaryStyle;
        const credits = document.createElement('div');
        credits.innerHTML = `<span style="font-weight: 600; letter-spacing: 0.5px; color: ${estilo.cores.textoSecundario};">v${SCRIPT_VERSION}</span> <span style="margin: 0 4px; color: ${estilo.cores.borda};">|</span> <span style="opacity: 0.7; color: ${estilo.cores.textoSecundario};">by Hackermoon</span>`;
        credits.style.cssText = ` text-align: center; font-size: 10px; font-weight: 500; margin-top: 10px; padding-top: 8px; border-top: 1px solid ${estilo.cores.borda}; opacity: 0.8; `;
        const notificationContainer = document.createElement('div'); notificationContainer.id = 'hck-beta-notifications'; // ID Atualizado
        notificationContainer.style.cssText = ` position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 10002; display: flex; flex-direction: column; align-items: center; gap: 12px; width: auto; max-width: 90%; `;
        STATE.notificationContainer = notificationContainer;
        menu.append(header, modelSelectorContainer, input, updateImagesBtn, imagesContainer, analyzeBtn, clearBtn, logsBtn, credits);
        container.append(menu, toggleBtn);
        document.body.appendChild(container); document.body.appendChild(notificationContainer);
        logMessage('INFO', 'Elementos da UI HCK BETA adicionados à página.');

        // --- ALERTA REMOVIDO ---
        // Não há mais chaves no código.

        // --- Funções de Controle da UI ---
        const toggleMenu = (show) => { const duration = 350; if (show) { logMessage('DEBUG', 'Mostrando menu...'); menu.style.display = 'flex'; toggleBtn.style.opacity = '0'; toggleBtn.style.transform = 'scale(0.8) translateY(10px)'; setTimeout(() => { menu.style.opacity = '1'; menu.style.transform = 'translateY(0) scale(1)'; toggleBtn.style.display = 'none'; }, 10); } else { logMessage('DEBUG', 'Escondendo menu...'); menu.style.opacity = '0'; menu.style.transform = 'translateY(20px) scale(0.9)'; setTimeout(() => { menu.style.display = 'none'; toggleBtn.style.display = 'flex'; requestAnimationFrame(() => { toggleBtn.style.opacity = '1'; toggleBtn.style.transform = 'scale(1) translateY(0)'; }); }, duration); } };
        toggleBtn.addEventListener('click', () => toggleMenu(true)); closeBtn.addEventListener('click', () => toggleMenu(false));
        const hideLogs = () => { if (STATE.logModal) { STATE.logModal.style.opacity = '0'; setTimeout(() => STATE.logModal.style.display = 'none', 300); logMessage('DEBUG', 'Escondendo logs.'); } };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (menu.style.display === 'flex') toggleMenu(false); if (STATE.logModal?.style.display !== 'none') hideLogs(); } });
        window.addEventListener('resize', () => { const s = getResponsiveSize(); menu.style.width = s.menuWidth; input.style.minHeight = s.textareaHeight; input.style.fontSize = s.fontSize; [analyzeBtn, clearBtn, updateImagesBtn, logsBtn].forEach(b => { b.style.fontSize = s.fontSize; b.style.padding = s.buttonPadding; }); imagesContainer.style.fontSize = `calc(${s.fontSize} - 2px)`; title.style.fontSize = s.titleSize; modelSelect.style.fontSize = `calc(${s.fontSize} - 1px)`; modelLabel.style.fontSize = `calc(${s.fontSize} - 2px)`;});

        // Atualiza display de imagens (apenas UI)
        const updateImageButtons = (images) => { if (!imagesContainer) return; if (images.length === 0) { imagesContainer.innerHTML = `<div style="text-align: center; padding: 3px; font-size: 0.9em; color: ${estilo.cores.textoSecundario};">Nenhuma imagem relevante detectada</div>`; return; } imagesContainer.innerHTML = images.map((img, i) => ` <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid ${estilo.cores.borda}; gap: 5px; &:last-child {border-bottom: none;}"> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; color: ${estilo.cores.texto}; font-size:0.9em;" title="${img}">Imagem ${i + 1}</span> <button data-url="${img}" title="Copiar URL" style="background: ${estilo.cores.fundoTerciario}; color: ${estilo.cores.textoSecundario}; border: none; border-radius: 4px; padding: 2px 5px; font-size: 10px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; font-weight: 500; &:hover{color: ${estilo.cores.texto}; background: ${estilo.cores.borda}}">Copiar</button> </div> `).join(''); imagesContainer.querySelectorAll('button[data-url]').forEach(b => { b.addEventListener('click', (e) => { navigator.clipboard.writeText(e.target.dataset.url).then(() => { e.target.textContent = 'Copiado!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1200); }).catch(err => { logMessage('ERROR', 'Falha ao copiar URL:', err); e.target.textContent = 'Falha!'; setTimeout(() => { e.target.textContent = 'Copiar'; }, 1500); }); }); }); };

        // Mostrar Notificações (Toast)
        const showResponse = (result, duration) => { if (!STATE.notificationContainer) { logMessage('ERROR', "Container de notificação não encontrado!"); return; } const { answer = "Info", detail = "", type = 'info' } = result || {}; let icon = 'ℹ️'; let titleText = answer; let detailText = detail; let effectiveDuration = duration || (type === 'error' || type === 'warn' ? CONFIG.NOTIFICATION_TIMEOUT_LONG : CONFIG.NOTIFICATION_TIMEOUT); let bgColor = estilo.cores.notificationBg; let titleColor = estilo.cores.texto; switch (type) { case 'success': icon = '✅'; titleColor = estilo.cores.sucesso; break; case 'error': icon = '❌'; titleColor = estilo.cores.erro; break; case 'warn': icon = '⚠️'; titleColor = estilo.cores.warn; break; case 'info': icon = 'ℹ️'; titleColor = estilo.cores.info; break; } const notification = document.createElement('div'); notification.style.cssText = ` background-color: ${bgColor}; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: ${estilo.cores.texto}; padding: 12px 18px; border-radius: ${estilo.radiusSmall}; box-shadow: ${estilo.sombras.notification}; display: flex; align-items: center; gap: 12px; min-width: 200px; max-width: 350px; opacity: 0; transform: translateY(20px); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid ${estilo.cores.borda}; cursor: pointer; `; const iconSpan = document.createElement('span'); iconSpan.textContent = icon; iconSpan.style.fontSize = '1.3em'; const textContent = document.createElement('div'); textContent.style.cssText = `flex-grow: 1; font-size: 0.98em; line-height: 1.35; word-break: break-word;`; textContent.innerHTML = `<span style="font-weight: 600; color: ${titleColor};">${titleText}</span> ${detailText ? `<span style="font-size: 0.9em; color: ${estilo.cores.textoSecundario}; margin-left: 4px; display: inline-block;">${detailText}</span>` : ''}`; let dismissTimeout; const dismiss = () => { clearTimeout(dismissTimeout); notification.style.opacity = '0'; notification.style.transform = 'translateY(25px) scale(0.95)'; setTimeout(() => notification.remove(), 400); }; notification.onclick = dismiss; notification.append(iconSpan, textContent); STATE.notificationContainer.appendChild(notification); requestAnimationFrame(() => { notification.style.opacity = '1'; notification.style.transform = 'translateY(0)'; }); dismissTimeout = setTimeout(dismiss, effectiveDuration); logMessage('INFO', `Notificação (${type} - ${effectiveDuration}ms): ${titleText} ${detailText}`); };

        // --- Modal de Logs ---
        const createLogModal = () => { if (STATE.logModal) return; logMessage('DEBUG', 'Criando modal de logs HCK BETA.'); const modal = document.createElement('div'); modal.id = 'hck-log-modal'; modal.style.cssText = ` position: fixed; inset: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 10001; font-family: 'Inter', sans-serif; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); opacity: 0; transition: opacity 0.3s ease-out;`; const modalContent = document.createElement('div'); modalContent.style.cssText = ` background-color: ${estilo.cores.fundoSecundario}; color: ${estilo.cores.texto}; padding: 18px 22px; border-radius: ${estilo.radius}; border: 1px solid ${estilo.cores.borda}; width: 90%; max-width: 850px; height: 80%; max-height: 700px; display: flex; flex-direction: column; box-shadow: ${estilo.sombras.menu}; transform: scale(0.95); transition: transform 0.3s ease-out;`; const modalHeader = document.createElement('div'); modalHeader.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid ${estilo.cores.borda}; padding-bottom: 10px; gap: 15px;`; const modalTitle = document.createElement('h3'); modalTitle.textContent = '📄 Logs Detalhados (HCK BETA)'; modalTitle.style.cssText = `margin: 0; color: ${estilo.cores.texto}; font-weight: 600; font-size: 17px; flex-grow: 1; font-family: 'Roboto Mono', monospace;`; const copyLogBtn = document.createElement('button'); copyLogBtn.textContent = 'Copiar'; copyLogBtn.style.cssText = ` background: ${estilo.cores.copyBtnBg}; color: ${estilo.cores.secondaryAccent}; border: none; font-size: 11px; font-weight: 500; padding: 5px 10px; border-radius: ${estilo.radiusSmall}; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; &:hover { background: ${estilo.cores.borda}; color: ${estilo.cores.texto}; }`; copyLogBtn.onclick = () => { const textToCopy = STATE.logMessages.map(log => `[${log.timestamp} ${log.level}] ${log.message}`).join('\n'); navigator.clipboard.writeText(textToCopy).then(() => { copyLogBtn.textContent = 'Copiado!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar'; }, 2000); logMessage('INFO', 'Logs copiados.'); }).catch(err => { logMessage('ERROR', 'Falha ao copiar logs:', err); copyLogBtn.textContent = 'Erro!'; setTimeout(() => { copyLogBtn.textContent = 'Copiar'; }, 2000); }); }; const closeLogBtn = document.createElement('button'); closeLogBtn.innerHTML = '×'; closeLogBtn.setAttribute('aria-label', 'Fechar Logs'); closeLogBtn.style.cssText = ` background: ${estilo.cores.fundoTerciario}; border: none; color: ${estilo.cores.textoSecundario}; font-size: 20px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; border-radius: 50%; width: 26px; height: 26px; display:flex; align-items:center; justify-content:center; transition: all 0.2s ease; flex-shrink: 0; &:hover { background-color: ${estilo.cores.borda}; color: ${estilo.cores.texto}; } `; closeLogBtn.onclick = hideLogs; modalHeader.append(modalTitle, copyLogBtn, closeLogBtn); const logArea = document.createElement('div'); logArea.id = 'hck-log-area'; logArea.style.cssText = ` flex-grow: 1; overflow-y: auto; font-size: 11.5px; line-height: 1.65; background-color: ${estilo.cores.fundo}; border-radius: ${estilo.radiusSmall}; padding: 12px; border: 1px solid ${estilo.cores.borda}; white-space: pre-wrap; word-wrap: break-word; scrollbar-width: thin; scrollbar-color: ${estilo.cores.fundoTerciario} ${estilo.cores.fundo}; font-family: 'Roboto Mono', monospace; &::-webkit-scrollbar { width: 7px; } &::-webkit-scrollbar-thumb { background-color: ${estilo.cores.fundoTerciario}; border-radius: 3px; } `; modalContent.append(modalHeader, logArea); modal.appendChild(modalContent); document.body.appendChild(modal); STATE.logModal = modal; };
        const showLogs = () => { logMessage('DEBUG', 'showLogs chamado.'); if (!STATE.logModal) createLogModal(); const logArea = STATE.logModal?.querySelector('#hck-log-area'); if (!logArea || !STATE.logModal) { logMessage('ERROR', 'Modal ou área de log não encontrada.'); return; } logMessage('INFO', `Exibindo ${STATE.logMessages.length} logs.`); logArea.innerHTML = STATE.logMessages.map(log => { const color = getLogColor(log.level); const sanitizedMsg = sanitizeHtml(log.message); return `<div style="margin-bottom: 4px;"><span style="color: ${color}; font-weight: bold; margin-right: 5px;">[${log.timestamp} ${log.level}]</span> <span style="color:${getLogColor('TEXT')};">${sanitizedMsg}</span></div>`; }).join(''); STATE.logModal.style.display = 'flex'; requestAnimationFrame(() => { STATE.logModal.style.opacity = '1'; STATE.logModal.querySelector('div').style.transform = 'scale(1)'; }); logArea.scrollTop = logArea.scrollHeight; };
        logsBtn.addEventListener('click', showLogs);

        return { elements: { input, analyzeBtn, clearBtn, updateImagesBtn, logsBtn, imagesContainer, toggleBtn, modelSelect }, helpers: { updateImageButtons, showResponse, toggleMenu, showLogs, hideLogs } };
    }

    // --- FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ---
    function init() {
        logMessage('INFO',`----- HCK BETA Bookmarklet Inicializando (v${SCRIPT_VERSION} - Blackbox Only) -----`);
        try {
            const ui = setupUI();
            if (!ui) throw new Error("Falha crítica na configuração da UI HCK BETA.");
            logMessage('INFO','Configuração da UI completa.');

            const { input, analyzeBtn, clearBtn, updateImagesBtn, toggleBtn, modelSelect } = ui.elements;
            const { updateImageButtons, showResponse } = ui.helpers;
            const estiloCores = { // Usando cores do novo tema
                erro: estilo.cores.erro,
                accentBg: estilo.cores.accentBg,
                fundoSecundario: estilo.cores.fundoSecundario,
                textoSecundario: estilo.cores.textoSecundario,
                borda: estilo.cores.borda
            };

            // Função para definir o estado do botão de análise
            window.setAnalyzeButtonState = (analyzing, rateLimited = false) => {
                 const currentBtn = document.getElementById('hck-beta-analyze-btn');
                 const currentToggleBtn = document.getElementById('hck-beta-toggle-btn');
                 const currentModelSelect = document.getElementById('hck-beta-model-select');
                 if (!currentBtn) return;

                 const selectedModel = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId);
                 const btnBaseText = `Analisar (${selectedModel?.name || 'Blackbox'})`;

                 currentBtn.disabled = analyzing || rateLimited;
                 if(currentModelSelect) currentModelSelect.disabled = analyzing || rateLimited;

                 if (rateLimited) {
                     currentBtn.textContent = `Limite Atingido...`;
                     currentBtn.style.backgroundColor = estiloCores.erro;
                     currentBtn.style.color = '#FFFFFF'; // Texto branco no erro
                     if(currentToggleBtn) currentToggleBtn.style.borderColor = estiloCores.erro;
                 } else if (analyzing) {
                     currentBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="${estiloCores.accent}"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75A11,11,0,0,0,12,1Z"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/></path></svg> Analisando...`; // Spinner + Texto
                     currentBtn.style.backgroundColor = estiloCores.accentBg;
                     currentBtn.style.color = estiloCores.accent; // Texto preto
                     if(currentToggleBtn) currentToggleBtn.style.borderColor = estiloCores.borda;
                 } else {
                     currentBtn.textContent = btnBaseText;
                     currentBtn.style.backgroundColor = estiloCores.accentBg;
                     currentBtn.style.color = estiloCores.accent; // Texto preto
                     if(currentToggleBtn) currentToggleBtn.style.borderColor = estiloCores.borda;
                 }
             };

            // --- AÇÃO DO BOTÃO ANALISAR ---
            analyzeBtn.onclick = async () => {
                logMessage('INFO', "----- Botão Analisar Clicado -----");
                const question = input.value.trim();
                const selectedModel = CONFIG.MODELS.find(m => m.id === STATE.selectedModelId);

                if (!selectedModel) {
                     logMessage('ERROR', "Nenhum modelo Blackbox válido selecionado ou configurado.");
                     showResponse({answer: "Erro Config", detail: "Nenhum modelo selecionado.", type: 'error' });
                     return;
                }

                if (STATE.isAnalyzing) {
                    logMessage('WARN', `Análise ignorada: Já está analisando.`);
                    showResponse({answer: "Aguarde", detail: "Análise em progresso", type: 'warn' });
                    return;
                }
                if (STATE.rateLimitActive) {
                     logMessage('WARN', `Análise ignorada: Backoff global de rate limit ativo.`);
                     showResponse({answer: "Limite Atingido", detail: "Aguarde e tente novamente.", type: 'error' });
                     setAnalyzeButtonState(false, true);
                     return;
                 }
                if (!question) {
                    logMessage('WARN', `Análise ignorada: Campo da questão vazio.`);
                    showResponse({answer: "Erro", detail: "Insira o texto da questão", type: 'error' });
                    input.focus();
                    return;
                }

                STATE.isAnalyzing = true;
                setAnalyzeButtonState(true);
                logMessage("INFO", `Iniciando análise com ${selectedModel.name}...`);
                logMessage("DEBUG", `Questão: ${question.substring(0,150)}...`);

                try {
                    // Extrai imagens apenas para UI, não para a API
                    const images = extractImages();
                    updateImageButtons(images);

                    // Constrói o prompt/payload para Blackbox
                    const payload = await buildPrompt(question, images, selectedModel);

                    logMessage('INFO', `Consultando ${selectedModel.name} via fetchWithRetry...`);

                    // Chama a API Blackbox com retentativas
                    const result = await fetchWithRetry(
                        selectedModel.name,
                        'blackbox',
                        () => queryBlackboxInternal(selectedModel, payload)
                    );

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
                     if (error.message.toLowerCase().includes('cors')) {
                        detailMsg = "Falha de Rede/CORS. Verifique o console.";
                     } else if (error.message.toLowerCase().includes('rate limit')) {
                        detailMsg = "Limite de requisições atingido.";
                        setAnalyzeButtonState(false, true); // Marca como rate limited na UI
                     } else if (error.message.toLowerCase().includes('cloudflare')) {
                         detailMsg = "API bloqueada (Cloudflare?). Tente mais tarde.";
                         setAnalyzeButtonState(false, true); // Marca como bloqueado na UI
                     }
                    showResponse({ answer: "Erro Análise", detail: detailMsg, type: 'error' });
                } finally {
                    STATE.isAnalyzing = false;
                    // Reavalia o estado do botão (pode ter entrado em rate limit durante a análise)
                    setAnalyzeButtonState(false, STATE.rateLimitActive);
                    logMessage("INFO", "----- Análise Finalizada -----");
                }
            };

            // --- OUTROS BOTÕES ---
            clearBtn.onclick = () => { logMessage('INFO', "----- Limpar Clicado -----"); input.value = ''; STATE.images = []; /* delete STATE.imageCache if removed */ updateImageButtons([]); input.focus(); logMessage("INFO", "Campos limpos."); showResponse({answer: "Limpado", type: 'info'}, 3000); };
            updateImagesBtn.onclick = () => { logMessage('INFO', "----- Atualizar Imagens (UI) Clicado -----"); try { extractImages(); updateImageButtons(STATE.images); showResponse({answer:"Imagens (UI) Atualizadas", detail:`${STATE.images.length} detectadas.`, type:'info'}, 3000); } catch (e) { logMessage("ERROR","Erro ao atualizar imagens:",e); showResponse({answer:"Erro Imagens", detail:"Falha leitura.", type:'error'}); }};

            // Extração inicial de imagens para a UI
            setTimeout(() => { logMessage("INFO", "Tentativa inicial de extração de imagens (UI)..."); try { extractImages(); updateImageButtons(STATE.images); } catch (e) { logMessage("ERROR", "Erro na extração inicial de imagens:", e); }}, 2000);

            logMessage('INFO',`----- HCK BETA Bookmarklet Inicializado (v${SCRIPT_VERSION} - Blackbox Only) -----`);
            ui.helpers.toggleMenu(true); // Abre o menu ao iniciar

        } catch (error) {
            logMessage('ERROR', '!!! ERRO CRÍTICO NA INICIALIZAÇÃO DO BOOKMARKLET !!!', error);
            console.error(`[HCK BETA Init Fail]: ${error.message}. Script pode não funcionar. Verifique o Console. Stack: ${error.stack}`);
            alert(`[HCK BETA Bookmarklet Init Fail]: ${error.message}. Verifique o console (F12) para detalhes.`);
            // Tenta remover a UI se ela foi parcialmente criada para evitar elementos quebrados
            const existingUI = document.getElementById('hck-beta-ui-bookmarklet');
            if (existingUI) existingUI.remove();
            const existingNotif = document.getElementById('hck-beta-notifications');
            if (existingNotif) existingNotif.remove();
             const existingLogModal = document.getElementById('hck-log-modal');
             if (existingLogModal) existingLogModal.remove();
        }
    }

    // --- Executa a inicialização ---
    init();

})();
