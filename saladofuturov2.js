javascript:(async()=>{
  const headers = {
    "x-api-realm": "edusp",
    "x-api-platform": "webclient",
    "x-api-key": _dadosLogin.auth_token,
    "content-type": "application/json"
  };

  async function loadCss(url){
    console.log("[Stage] Carregando CSS...");
    const res = await fetch(url);
    const style = document.createElement('style');
    style.innerHTML = await res.text();
    document.head.appendChild(style);
    console.log("[Stage] CSS carregado.");
  }

  async function loadScript(url){
    console.log("[Stage] Carregando Script...");
    return new Promise((resolve, reject)=>{
      const script = document.createElement('script');
      script.src = url;
      script.onload = ()=>{ console.log("[Stage] Script carregado."); resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function sendToast(text, background = "#000"){
    Toastify({
      text,
      duration: 4000,
      gravity: "bottom",
      position: "center",
      stopOnFocus: true,
      style: {
        background,
        color: "#fff",
        padding: "10px 20px",
        borderRadius: "5px",
        fontFamily: "Arial, sans-serif"
      }
    }).showToast();
  }

  function cleanHtml(html){
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  function transformJson(original){
    const result = {
      accessed_on: original.accessed_on,
      executed_on: original.executed_on,
      answers: {}
    };

    for(const questionId in original.answers){
      const question = original.answers[questionId];
      const taskQuestion = original.task.questions.find(q => q.id === parseInt(questionId));
      if(!taskQuestion) continue;

      const base = { question_id: question.question_id, question_type: taskQuestion.type };
      switch(taskQuestion.type){
        case "order-sentences":
          result.answers[questionId] = { ...base, answer: taskQuestion.options.sentences.map(s => s.value) };
          break;
        case "fill-words":
          result.answers[questionId] = { ...base, answer: taskQuestion.options.phrase.filter((_,i)=>i%2).map(p=>p.value) };
          break;
        case "text_ai":
          result.answers[questionId] = { ...base, answer: { "0": cleanHtml(taskQuestion.comment.replace(/<\/?p>/g,'')) } };
          break;
        case "fill-letters":
          result.answers[questionId] = { ...base, answer: taskQuestion.options.answer };
          break;
        case "cloud":
          result.answers[questionId] = { ...base, answer: taskQuestion.options.ids };
          break;
        default:
          result.answers[questionId] = { 
            ...base, 
            answer: Object.fromEntries(Object.entries(taskQuestion.options).map(([id,opt])=>[id,opt.answer]))
          };
      }
    }

    return result;
  }

  async function getAnswers(taskId, id){
    console.log("[Stage] Buscando respostas...");
    const url = `https://edusp-api.ip.tv/tms/task/${id}/answer/${taskId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
    const res = await fetch(url, { headers });
    if(!res.ok) throw new Error("Falha ao buscar respostas.");
    console.log("[Stage] Respostas obtidas.");
    return res.json();
  }

  async function submitAnswers(oldAnswers, taskId, id){
    console.log("[Stage] Enviando respostas...");
    const url = `https://edusp-api.ip.tv/tms/task/${id}/answer/${taskId}`;
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(transformJson(oldAnswers))
    });
    if(!res.ok) throw new Error("Falha ao enviar respostas.");
    console.log("[Stage] Respostas enviadas com sucesso!");
  }

  async function handleReplay(data){
    try{
      sendToast("Reenviando respostas...");
      await submitAnswers(await getAnswers(data.id, data.task_id), data.id, data.task_id);
      sendToast("Respostas reenviadas com sucesso!", "#0a0");
      const title = document.title;
      document.title = "Fandangos";
      setTimeout(()=>document.title=title, 2000);
    }catch(e){
      console.error("[ERROR]", e);
      sendToast("Erro no replay!", "#f00");
    }
  }

  console.log("[Stage] Iniciando injeção...");
  await loadCss('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css');
  await loadScript('https://cdn.jsdelivr.net/npm/toastify-js');

  sendToast("Sistema Injetado!");

  const originalFetch = window.fetch;
  window.fetch = async function(input, init){
    const url = typeof input === "string" ? input : input.url;
    const response = await originalFetch.call(this, input, init);

    if(/^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/.test(url)){
      try{
        console.log("[Stage] Interceptando envio...");
        const clone = response.clone();
        const data = await clone.json();
        if(data.status !== "draft"){
          await handleReplay(data);
        }else{
          console.log("[Stage] Tarefa em rascunho, ignorado.");
        }
      }catch(err){
        console.error("[Stage] Erro no interceptador:", err);
      }
    }

    return response;
  };
})();
