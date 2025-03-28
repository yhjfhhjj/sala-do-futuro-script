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
    actionBtn.innerHTML = '🔍 Analisar';
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
        transition: 'all 0.3s ease'
    });
    actionBtn.onmouseover = () => {
        actionBtn.style.transform = 'scale(1.05)';
        actionBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
    };
    actionBtn.onmouseout = () => {
        actionBtn.style.transform = 'scale(1)';
        actionBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    };

    const input = document.createElement('textarea');
    input.id = 'gemini-question-input';
    input.placeholder = 'Cole sua pergunta com alternativas aqui\nExemplo:\nQual é a capital do Brasil?\na) Rio de Janeiro\nb) São Paulo\nc) Brasília';
    Object.assign(input.style, {
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        background: '#f9f9f9',
        fontSize: '14px',
        outline: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        resize: 'vertical',
        minHeight: '80px',
        width: '300px',
        transition: 'all 0.3s ease'
    });
    input.onfocus = () => input.style.borderColor = '#4285f4';
    input.onblur = () => input.style.borderColor = '#e0e0e0';

    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '🗑️ Limpar';
    Object.assign(clearBtn.style, {
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #ff4444, #cc3333)',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'all 0.3s ease'
    });
    clearBtn.onmouseover = () => {
        clearBtn.style.transform = 'scale(1.05)';
        clearBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    };
    clearBtn.onmouseout = () => {
        clearBtn.style.transform = 'scale(1)';
        clearBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    };

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
        animation: 'slideIn 0.3s ease'
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    container.appendChild(actionBtn);
    container.appendChild(input);
    container.appendChild(clearBtn);
    container.appendChild(responsePanel);
    document.body.appendChild(container);

    return { actionBtn, input, clearBtn, responsePanel };
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

function clearUI(input, responsePanel) {
    input.value = '';
    responsePanel.style.display = 'none';
}

window.createUI = createUI;
window.showResponse = showResponse;
window.clearUI = clearUI;
