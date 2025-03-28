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
        gap: '12px',
        fontFamily: 'Arial, sans-serif'
    });

    const actionBtn = document.createElement('button');
    actionBtn.id = 'gemini-helper-btn';
    actionBtn.innerHTML = '🔍 Analisar Página';
    Object.assign(actionBtn.style, {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #4285f4, #357abd)',
        color: 'white',
        border: 'none',
        borderRadius: '30px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s'
    });
    actionBtn.onmouseover = () => {
        actionBtn.style.transform = 'scale(1.05)';
        actionBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
    };
    actionBtn.onmouseout = () => {
        actionBtn.style.transform = 'scale(1)';
        actionBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    };

    const input = document.createElement('input');
    input.id = 'gemini-question-input';
    input.placeholder = 'Faça uma pergunta ou deixe em branco';
    Object.assign(input.style, {
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        background: '#f9f9f9',
        fontSize: '14px',
        outline: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        display: 'none',
        transition: 'border-color 0.2s'
    });
    input.onfocus = () => input.style.borderColor = '#4285f4';
    input.onblur = () => input.style.borderColor = '#e0e0e0';

    const responsePanel = document.createElement('div');
    responsePanel.id = 'gemini-response-panel';
    Object.assign(responsePanel.style, {
        display: 'none',
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        maxWidth: '400px',
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #eee',
        animation: 'fadeIn 0.3s ease'
    });

    // Adicionar estilo de animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    container.appendChild(actionBtn);
    container.appendChild(input);
    container.appendChild(responsePanel);
    document.body.appendChild(container);

    return { actionBtn, input, responsePanel };
}

function showResponse(panel, answer) {
    panel.innerHTML = `
        <div style="padding: 14px; background: linear-gradient(135deg, #34a853, #2d9046); color: white; border-radius: 8px; text-align: center; font-size: 16px; line-height: 1.4;">
            <strong>${answer}</strong>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #888; text-align: center;">
            Clique fora para fechar
        </div>
    `;
    panel.style.display = 'block';
}

window.createUI = createUI;
window.showResponse = showResponse;
