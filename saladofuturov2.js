(async () => {
  const SCRIPT_NAME = "HCK TAREFAS";
  console.log(`Iniciando ${SCRIPT_NAME}...`);

  const TOAST_BACKGROUND_COLOR = 'rgba(20, 20, 20, 0.9)';
  const TOAST_TEXT_COLOR = '#f0f0f0';

  function injectToastStyles() {
    const styleId = 'hck-toast-styles';
    if (document.getElementById(styleId)) return;

    const css = `
      @keyframes toastProgress {
        from { width: 100%; }
        to { width: 0%; }
      }
      .hck-toast-with-progress {
        position: relative;
        overflow: hidden;
      }
      .hck-toast-with-progress::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        width: 100%;
        background: ${TOAST_TEXT_COLOR};
        opacity: 0.8;
        animation: toastProgress linear forwards;
        animation-duration: var(--toast-duration, 3000ms);
      }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function sendToast(text, duration = 3000, gravity = 'bottom') {
    try {
      const toastStyle = {
        background: TOAST_BACKGROUND_COLOR,
        fontSize: '13.5px',
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
        color: TOAST_TEXT_COLOR,
        padding: '12px 18px', // Padding horizontal ajustado
        paddingBottom: '17px',
        borderRadius: '8px',
        display: 'inline-flex', // Para ajustar largura ao conteúdo
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        // Removido minWidth e maxWidth
      };

      const toastInstance = Toastify({
        text: text,
        duration: duration,
        gravity: gravity,
        position: "center",
        stopOnFocus: true,
        style: toastStyle,
      });

      if (toastInstance.toastElement) {
         toastInstance.toastElement.classList.add('hck-toast-with-progress');
         toastInstance.toastElement.style.setProperty('--toast-duration', `${duration}ms`);
      } else {
          // console.warn("[HCK TAREFAS] Não foi possível obter toastElement para aplicar estilos de progresso."); // Log Removido
      }

      toastInstance.showToast();

    } catch (e) {
      console.error("Toastify Error:", e);
      alert(text);
    }
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.type = 'text/javascript';
      script.onload = resolve;
      script.onerror = () => {
        console.error(`Erro ao carregar script: ${url}`);
        reject(new Error(`Falha ao carregar ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  async function loadCss(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${url}"]`)) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = url;
      link.onload = resolve;
      link.onerror = () => {
        console.error(`Erro ao carregar CSS: ${url}`);
        reject(new Error(`Falha ao carregar ${url}`));
      };
      document.head.appendChild(link);
    });
  }

  function removeHtmlTags(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString || '';
    return div.textContent || div.innerText || '';
  }

  function transformJson(jsonOriginal) {
    if (!jsonOriginal || !jsonOriginal.task || !jsonOriginal.task.questions) {
      console.error("[HCK TAREFAS] Estrutura do JSON original inválida para transformação:", jsonOriginal);
      throw new Error("Estrutura de dados inválida para transformação.");
    }

    let novoJson = {
      accessed_on: jsonOriginal.accessed_on,
      executed_on: jsonOriginal.executed_on,
      answers: {}
    };

    for (let questionId in jsonOriginal.answers) {
      let questionData = jsonOriginal.answers[questionId];
      let taskQuestion = jsonOriginal.task.questions.find(q => q.id === parseInt(questionId));

      if (!taskQuestion) {
        //console.warn(`[HCK TAREFAS] Questão com ID ${questionId} não encontrada nos dados da tarefa. Pulando.`); // Log Removido
        continue;
      }

      let answerPayload = {
        question_id: questionData.question_id,
        question_type: taskQuestion.type,
        answer: null
      };

      try {
        switch (taskQuestion.type) {
          case "order-sentences":
            if (taskQuestion.options && taskQuestion.options.sentences && Array.isArray(taskQuestion.options.sentences)) {
              answerPayload.answer = taskQuestion.options.sentences.map(sentence => sentence.value);
            } else {
              //console.warn(`[HCK TAREFAS] Estrutura inesperada para order-sentences ID ${questionId}`); // Log Removido
            }
            break;
          case "fill-words":
            if (taskQuestion.options && taskQuestion.options.phrase && Array.isArray(taskQuestion.options.phrase)) {
              answerPayload.answer = taskQuestion.options.phrase
                .map(item => item.value)
                .filter((_, index) => index % 2 !== 0);
            } else {
              //console.warn(`[HCK TAREFAS] Estrutura inesperada para fill-words ID ${questionId}`); // Log Removido
            }
            break;
          case "text_ai":
            let cleanedAnswer = removeHtmlTags(taskQuestion.comment || '');
            answerPayload.answer = { "0": cleanedAnswer };
            break;
          case "fill-letters":
            if (taskQuestion.options && taskQuestion.options.answer !== undefined) {
              answerPayload.answer = taskQuestion.options.answer;
            } else {
              //console.warn(`[HCK TAREFAS] Estrutura inesperada para fill-letters ID ${questionId}`); // Log Removido
            }
            break;
          case "cloud":
            if (taskQuestion.options && taskQuestion.options.ids && Array.isArray(taskQuestion.options.ids)) {
              answerPayload.answer = taskQuestion.options.ids;
            } else {
              //console.warn(`[HCK TAREFAS] Estrutura inesperada para cloud ID ${questionId}`); // Log Removido
            }
            break;
          default:
            if (taskQuestion.options && typeof taskQuestion.options === 'object') {
              answerPayload.answer = Object.fromEntries(
                Object.keys(taskQuestion.options).map(optionId => {
                  const optionData = taskQuestion.options[optionId];
                  const answerValue = (optionData && optionData.answer !== undefined) ? optionData.answer : false;
                  return [optionId, answerValue];
                })
              );
            } else {
              //console.warn(`[HCK TAREFAS] Tipo de questão "${taskQuestion.type}" (ID ${questionId}) não possui opções ou estrutura desconhecida.`); // Log Removido
            }
            break;
        }
        novoJson.answers[questionId] = answerPayload;
      } catch (err) {
        console.error(`[HCK TAREFAS] Erro ao processar questão ID ${questionId}, tipo ${taskQuestion.type}:`, err);
        sendToast(`Erro processando questão ${questionId}. Ver console.`, 5000);
        continue;
      }
    }
    return novoJson;
  }

  async function pegarRespostasCorretas(taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
    //console.log("[HCK TAREFAS] Buscando respostas. Headers:", headers); // Log Removido
    sendToast("Buscando respostas corretas...", 2000);
    try {
      const response = await fetch(url, { method: "GET", headers: headers });
      if (!response.ok) {
        console.error(`[HCK TAREFAS] Erro ${response.status} ao buscar respostas. URL: ${url}`);
        throw new Error(`Erro ${response.status} ao buscar respostas.`);
      }
      const data = await response.json();
      //console.log("[HCK TAREFAS] Respostas corretas recebidas:", data); // Log Removido
      return data;
    } catch (error) {
      console.error("[HCK TAREFAS] Falha detalhada ao buscar respostas corretas:", error);
      sendToast(`Erro ao buscar respostas: ${error.message}`, 5000);
      throw error;
    }
  }

  async function enviarRespostasCorrigidas(respostasAnteriores, taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}`;
    try {
      const novasRespostasPayload = transformJson(respostasAnteriores);
      //console.log("[HCK TAREFAS] Enviando respostas. Payload:", JSON.stringify(novasRespostasPayload, null, 2)); // Log Removido
      //console.log("[HCK TAREFAS] Enviando respostas. Headers:", headers); // Log Removido
      sendToast("Enviando respostas corrigidas...", 2000);

      const response = await fetch(url, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(novasRespostasPayload)
      });

      if (!response.ok) {
        let errorBody = await response.text();
        console.error(`[HCK TAREFAS] Erro ${response.status} no PUT. URL: ${url}. Response Body:`, errorBody);
        try { errorBody = JSON.parse(errorBody); } catch (e) {}
        throw new Error(`Erro ${response.status} ao enviar respostas.`);
      }

      //console.log("[HCK TAREFAS] Respostas corrigidas enviadas com sucesso."); // Log Removido
      sendToast("Tarefa corrigida com sucesso!", 5000);

      const oldTitle = document.title;
      document.title = `${SCRIPT_NAME} Fez a Boa!`;
      setTimeout(() => { document.title = oldTitle; }, 3000);

    } catch (error) {
      console.error("[HCK TAREFAS] Falha detalhada ao transformar ou enviar respostas corrigidas:", error);
      sendToast(`Erro na correção: ${error.message}`, 5000);
    }
  }

  let capturedLoginData = null;
  let isToastifyLoaded = false;
  const originalFetch = window.fetch;

  try {
    // Carrega fontes primeiro (opcional, pode ser em paralelo)
    await loadCss('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');
    // Carrega dependências do Toastify
    await loadCss('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
    await loadScript('https://cdn.jsdelivr.net/npm/toastify-js');
    isToastifyLoaded = true;
    injectToastStyles();

    sendToast(`>> ${SCRIPT_NAME} Injetado! Aguardando login...`, 3000);
    sendToast("Créditos: inacallep, miitch, crackingnlearn, hackermoon", 5000);

  } catch (error) {
    console.error("[HCK TAREFAS] Falha ao carregar dependências (Toastify ou Fonte):", error);
    alert(`${SCRIPT_NAME}: Erro ao carregar dependências. Notificações podem falhar.`);
  }

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = init ? init.method : 'GET';
    //console.log(`[HCK TAREFAS] Fetching: ${method} ${url}`); // Log Removido

    if (url === 'https://edusp-api.ip.tv/registration/edusp/token' && !capturedLoginData) {
       //console.log('[HCK TAREFAS] Interceptando requisição de token...'); // Log Removido
      try {
        const response = await originalFetch.apply(this, arguments);
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        //console.log("[HCK TAREFAS] Resposta da API de Token Recebida:", data); // Log Removido

        if (data && data.auth_token) {
          capturedLoginData = data;
          //console.log("[HCK TAREFAS] >>> Token Capturado com Sucesso:", capturedLoginData.auth_token); // Log Removido
          //console.log("[HCK TAREFAS] Dados completos de login capturados:", capturedLoginData); // Log Removido

          if (isToastifyLoaded) {
            sendToast("Entrada feita com sucesso!", 3000);

            const fullUserName = data?.name;
            let firstName = '';
            if (fullUserName && typeof fullUserName === 'string') {
                const nameParts = fullUserName.trim().split(' ');
                firstName = nameParts[0] || '';
                if (firstName) {
                   firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                }
            }

            if (firstName) {
              setTimeout(() => {
                sendToast(`Seja bem-vindo(a), ${firstName}!`, 3500);
              }, 250);
            } else {
              //console.warn("[HCK TAREFAS] Não foi possível encontrar ou processar 'name' na resposta do token."); // Log Removido
            }

          } else {
            alert(`${SCRIPT_NAME}: Token capturado!`);
          }
        } else {
           console.warn("[HCK TAREFAS] Resposta do token recebida, mas 'auth_token' não encontrado na estrutura esperada:", data); // Mantido Warn importante
           if (isToastifyLoaded) {
               sendToast("Erro: Formato de resposta do token inesperado. Ver console.", 5000);
           }
        }
        return response;
      } catch (error) {
        console.error('[HCK TAREFAS] Erro CRÍTICO ao processar resposta do token:', error); // Mantido Erro Crítico
        if (isToastifyLoaded) {
          sendToast("Erro CRÍTICO ao capturar token. Ver console.", 5000);
        } else {
          alert(`${SCRIPT_NAME}: Erro CRÍTICO ao capturar token.`);
        }
        return originalFetch.apply(this, arguments);
      }
    }

    const response = await originalFetch.apply(this, arguments);

    const answerSubmitRegex = /^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/;
    if (answerSubmitRegex.test(url) && init && init.method === 'POST') {
      //console.log("[HCK TAREFAS] Interceptando envio de resposta POST..."); // Log Removido
      //console.log("[HCK TAREFAS] Verificando token antes de corrigir. capturedLoginData existe?", !!capturedLoginData); // Log Removido

      if (!capturedLoginData || !capturedLoginData.auth_token) {
        //console.warn("[HCK TAREFAS] Tentativa de correção, mas o token ainda não foi capturado ou é inválido."); // Log Removido
        if (isToastifyLoaded) {
          sendToast("Ops! Token não encontrado. Envie novamente após login.", 4000);
        }
        return response;
      }

      try {
        const clonedResponse = response.clone();
        const submittedData = await clonedResponse.json();
        //console.log("[HCK TAREFAS] Resposta do POST original enviada detectada:", submittedData); // Log Removido

        if (submittedData && submittedData.status !== "draft" && submittedData.id && submittedData.task_id) {
           //console.log("[HCK TAREFAS] Status OK para correção automática. Iniciando processo..."); // Log Removido
           sendToast("Envio detectado! Iniciando correção...", 2000);

          const headers_template = {
            "x-api-realm": "edusp",
            "x-api-platform": "webclient",
            "x-api-key": capturedLoginData.auth_token,
            "content-type": "application/json"
          };
          //console.log("[HCK TAREFAS] Headers para correção:", headers_template); // Log Removido

          setTimeout(async () => {
             //console.log("[HCK TAREFAS] Executando correção após delay..."); // Log Removido
            try {
              const respostasOriginaisComGabarito = await pegarRespostasCorretas(submittedData.task_id, submittedData.id, headers_template);
              await enviarRespostasCorrigidas(respostasOriginaisComGabarito, submittedData.task_id, submittedData.id, headers_template);
            } catch (correctionError) {
              // Erros já são logados dentro das funções pegar/enviar
              //console.error("[HCK TAREFAS] Erro final capturado durante o processo de correção automática:", correctionError); // Log Removido
            }
          }, 500);

        } else {
          //console.log("[HCK TAREFAS] Envio detectado, mas não requer correção (status draft ou dados faltando). Status:", submittedData?.status, "ID:", submittedData?.id, "Task ID:", submittedData?.task_id); // Log Removido
        }
      } catch (err) {
        console.error('[HCK TAREFAS] Erro ao processar a resposta JSON do envio de tarefa POST:', err); // Mantido Erro importante
        if (isToastifyLoaded) {
            sendToast("Erro ao processar envio. Ver console.", 5000);
        }
      }
    }

    return response;
  };

  console.log(`[HCK TAREFAS] ${SCRIPT_NAME}: Interceptador de fetch ativo.`);

})();
