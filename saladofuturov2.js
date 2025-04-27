(async () => {
  const SCRIPT_NAME = "HCK TAREFAS";
  console.log(`Iniciando ${SCRIPT_NAME}...`);

  function sendToast(text, duration = 3000, gravity = 'bottom', backgroundColor = "#0d6efd") {
    try {
      const toastStyle = {
        background: backgroundColor,
        fontSize: '14px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)'
      };

      Toastify({
        text: text,
        duration: duration,
        gravity: gravity,
        position: "center",
        stopOnFocus: true,
        style: toastStyle,
      }).showToast();

    } catch (e) {
      console.error("Erro ao mostrar toast (Toastify não carregado?):", e);
      alert(text);
    }
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        console.log(`Script já carregado: ${url}`);
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
      console.log(`Carregando script: ${url}`);
    });
  }

  async function loadCss(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${url}"]`)) {
        console.log(`CSS já carregado: ${url}`);
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
      console.log(`Carregando CSS: ${url}`);
    });
  }

  function removeHtmlTags(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString || '';
    return div.textContent || div.innerText || '';
  }

  function transformJson(jsonOriginal) {
    if (!jsonOriginal || !jsonOriginal.task || !jsonOriginal.task.questions) {
      console.error("Estrutura do JSON original inválida para transformação:", jsonOriginal);
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
        console.warn(`[transformJson] Questão com ID ${questionId} não encontrada nos dados da tarefa. Pulando.`);
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
              console.warn(`[transformJson] Estrutura inesperada para order-sentences ID ${questionId}`);
            }
            break;
          case "fill-words":
            if (taskQuestion.options && taskQuestion.options.phrase && Array.isArray(taskQuestion.options.phrase)) {
              answerPayload.answer = taskQuestion.options.phrase
                .map(item => item.value)
                .filter((_, index) => index % 2 !== 0);
            } else {
              console.warn(`[transformJson] Estrutura inesperada para fill-words ID ${questionId}`);
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
              console.warn(`[transformJson] Estrutura inesperada para fill-letters ID ${questionId}`);
            }
            break;
          case "cloud":
            if (taskQuestion.options && taskQuestion.options.ids && Array.isArray(taskQuestion.options.ids)) {
              answerPayload.answer = taskQuestion.options.ids;
            } else {
              console.warn(`[transformJson] Estrutura inesperada para cloud ID ${questionId}`);
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
              console.warn(`[transformJson] Tipo de questão "${taskQuestion.type}" (ID ${questionId}) não possui opções ou estrutura desconhecida.`);
            }
            break;
        }
        novoJson.answers[questionId] = answerPayload;
      } catch (err) {
        console.error(`[transformJson] Erro ao processar questão ID ${questionId}, tipo ${taskQuestion.type}:`, err);
        sendToast(`Erro processando questão ${questionId}. Ver console.`, 5000, 'bottom', '#dc3545');
        continue;
      }
    }
    return novoJson;
  }

  async function pegarRespostasCorretas(taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
    sendToast("Buscando respostas corretas...", 2000, 'bottom', '#0dcaf0');
    try {
      const response = await fetch(url, { method: "GET", headers: headers });
      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao buscar respostas.`);
      }
      const data = await response.json();
      console.log("Respostas corretas recebidas:", data);
      return data;
    } catch (error) {
      console.error("Falha ao buscar respostas corretas:", error);
      sendToast(`Erro ao buscar respostas: ${error.message}`, 5000, 'bottom', '#dc3545');
      throw error;
    }
  }

  async function enviarRespostasCorrigidas(respostasAnteriores, taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}`;
    try {
      const novasRespostasPayload = transformJson(respostasAnteriores);
      console.log("Payload para enviar:", JSON.stringify(novasRespostasPayload, null, 2));
      sendToast("Enviando respostas corrigidas...", 2000, 'bottom', '#0dcaf0');

      const response = await fetch(url, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(novasRespostasPayload)
      });

      if (!response.ok) {
        let errorBody = await response.text();
        try { errorBody = JSON.parse(errorBody); } catch (e) {}
        console.error("Erro no PUT:", response.status, errorBody);
        throw new Error(`Erro ${response.status} ao enviar respostas.`);
      }

      console.log("Respostas corrigidas enviadas com sucesso.");
      sendToast("Tarefa corrigida com sucesso!", 5000, 'bottom', '#198754');

      const oldTitle = document.title;
      document.title = `${SCRIPT_NAME} Fez a Boa!`;
      setTimeout(() => { document.title = oldTitle; }, 3000);

    } catch (error) {
      console.error("Falha ao transformar ou enviar respostas corrigidas:", error);
      sendToast(`Erro na correção: ${error.message}`, 5000, 'bottom', '#dc3545');
    }
  }

  let capturedLoginData = null;
  let isToastifyLoaded = false;
  const originalFetch = window.fetch;

  try {
    await loadCss('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
    await loadScript('https://cdn.jsdelivr.net/npm/toastify-js');
    isToastifyLoaded = true;

    sendToast(`>> ${SCRIPT_NAME} Injetado! Aguardando login...`, 3000, 'bottom', '#0d6efd');
    sendToast("Créditos: inacallep, miitch, crackingnlearn, hackermoon", 5000, 'bottom', '#6c757d');

  } catch (error) {
    console.error("Falha ao carregar dependências (Toastify):", error);
    alert(`${SCRIPT_NAME}: Erro ao carregar Toastify. Notificações podem falhar.`);
  }

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;

    if (url === 'https://edusp-api.ip.tv/registration/edusp/token' && !capturedLoginData) {
      try {
        const response = await originalFetch.apply(this, arguments);
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        if (data && data.auth_token) {
          capturedLoginData = data;
          console.log("Dados de login capturados:", capturedLoginData);
          if (isToastifyLoaded) {
            sendToast("Token de autenticação capturado!", 3000, 'bottom', '#198754');
          } else {
            alert(`${SCRIPT_NAME}: Token capturado!`);
          }
        }
        return response;
      } catch (error) {
        console.error('Erro ao processar resposta do token:', error);
        if (isToastifyLoaded) {
          sendToast("Erro ao capturar token. Ver console.", 5000, 'bottom', '#dc3545');
        } else {
          alert(`${SCRIPT_NAME}: Erro ao capturar token.`);
        }
        return originalFetch.apply(this, arguments);
      }
    }

    const response = await originalFetch.apply(this, arguments);

    const answerSubmitRegex = /^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/;
    if (answerSubmitRegex.test(url) && init && init.method === 'POST') {
      if (!capturedLoginData) {
        console.warn("Envio de resposta detectado, mas token ainda não capturado.");
        if (isToastifyLoaded) {
          sendToast("Ops! Token não encontrado. Envie novamente após login.", 4000, 'bottom', '#ffc107');
        }
        return response;
      }

      try {
        const clonedResponse = response.clone();
        const submittedData = await clonedResponse.json();
        console.log("Resposta enviada detectada:", submittedData);

        if (submittedData && submittedData.status !== "draft" && submittedData.id && submittedData.task_id) {
           sendToast("Envio detectado! Iniciando correção...", 2000, 'bottom', '#0dcaf0');

          const headers_template = {
            "x-api-realm": "edusp",
            "x-api-platform": "webclient",
            "x-api-key": capturedLoginData.auth_token,
            "content-type": "application/json"
          };

          setTimeout(async () => {
            try {
              const respostasOriginaisComGabarito = await pegarRespostasCorretas(submittedData.task_id, submittedData.id, headers_template);
              await enviarRespostasCorrigidas(respostasOriginaisComGabarito, submittedData.task_id, submittedData.id, headers_template);
            } catch (correctionError) {
              console.error("Erro durante o processo de correção automática:", correctionError);
            }
          }, 500);

        } else {
          console.log("Envio detectado, mas não requer correção (status draft ou dados faltando).");
        }
      } catch (err) {
        console.error('Erro ao processar a resposta do envio de tarefa:', err);
        if (isToastifyLoaded) {
            sendToast("Erro ao processar envio. Ver console.", 5000, 'bottom', '#dc3545');
        }
      }
    }

    return response;
  };

  console.log(`${SCRIPT_NAME}: Interceptador de fetch ativo.`);

})();
