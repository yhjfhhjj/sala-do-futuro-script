// Funções de interface de usuário
function createUI() {
    const existingUI = document.getElementById('gemini-helper-container');
    if (existingUI) existingUI.remove();

    const container = document.createElement('div');
    container.id = 'gemini-helper-container';
    Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    });

    const actionBtn = document.createElement('button');
    actionBtn.id = 'gemini-helper-btn';
    actionBtn.textContent = '🔍 Analisar Página';
    Object.assign(actionBtn.style, {
        padding: '12px 20px',
        backgroundColor: '#4285f4',
        color: 'white',
        border: 'none',
        borderRadius: '24px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    });

    const input = document.createElement('input');
    input.id = 'gemini-question-input';
    input.placeholder = 'Digite sua pergunta (opcional)';
    Object.assign(input.style, {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        display: 'none'
    });

    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        maxWidth: '350px'
    });

    container.appendChild(actionBtn);
    container.appendChild(input);
    container.appendChild(responsePanel);
    document.body.appendChild(container);

    return { actionBtn, input, responsePanel };
}

function showResponse(panel, answer) {
    panel.innerHTML = `
        <div style="padding:12px; background:#34a853; color:white; border-radius:6px; text-align:center; font-size:18px;">
            <strong>${answer}</strong>
        </div>
        <div style="margin-top:12px; font-size:12px; color:#666; text-align:center;">
            Clique fora para fechar
        </div>
    `;
    panel.style.display = 'block';
}

// Exportar funções para uso em bookmarklet.js
window.createUI = createUI;
window.showResponse = showResponse;
