window.initMistralSolver = function (config) {
    'use strict';

    if (window.top !== window.self) return;

    const API_KEY = config.apiKey || '';
    const LOGO_URL = config.logoUrl || 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png';
    const API_URL = 'https://api.mistral.ai/v1/chat/completions';
    const MODELS = ['pixtral-12b-2409', 'mistral-small-latest'];

    let screenStream = null;
    let captureVideo = null;
    let lastRawAnswer = '';

    // Nạp CSS KaTeX
    const katexCss = document.createElement('link');
    katexCss.rel = 'stylesheet';
    katexCss.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    document.head.appendChild(katexCss);

    // CSS Glassmorphism
    const style = document.createElement('style');
    style.textContent = `
        #ms-root {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            width: 380px;
            color: #f8fafc;
            user-select: none;
            transition: opacity 0.2s ease;
        }
        #ms-card {
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 16px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            overflow: hidden;
        }
        #ms-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.04);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            cursor: grab;
        }
        #ms-header:active { cursor: grabbing; }
        .ms-brand {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13.5px;
            font-weight: 700;
            letter-spacing: 0.3px;
            color: #f1f5f9;
        }
        .ms-logo-wrap {
            position: relative;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ms-logo {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            object-fit: cover;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .ms-dot {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #64748b;
            border: 1.5px solid #0f172a;
            transition: all 0.3s ease;
        }
        .ms-dot.active {
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
        }
        .ms-actions {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .ms-btn {
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12.5px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.18s ease;
        }
        .ms-btn-primary {
            background: linear-gradient(135deg, #f97316, #ea580c);
            color: #fff;
            padding: 6px 14px;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);
        }
        .ms-btn-primary:hover:not(:disabled) {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }
        .ms-btn-primary:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }
        .ms-btn-icon {
            background: rgba(255, 255, 255, 0.08);
            color: #cbd5e1;
            width: 28px;
            height: 28px;
            padding: 0;
        }
        .ms-btn-icon:hover {
            background: rgba(255, 255, 255, 0.18);
            color: #fff;
        }
        #ms-body {
            display: none;
            flex-direction: column;
        }
        #ms-body.open { display: flex; }
        #ms-result {
            max-height: 400px;
            overflow-y: auto;
            overflow-x: auto;
            padding: 14px 16px;
            font-size: 14px;
            line-height: 1.65;
            color: #f1f5f9;
            word-break: break-word;
            user-select: text;
        }
        #ms-result::-webkit-scrollbar { width: 6px; height: 6px; }
        #ms-result::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
            border-radius: 99px;
        }
        #ms-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 14px;
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 11.5px;
            color: #94a3b8;
        }
        .ms-spinner {
            width: 13px;
            height: 13px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: ms-spin 0.7s linear infinite;
            display: inline-block;
        }
        @keyframes ms-spin { to { transform: rotate(360deg); } }
        .ms-loading-box {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #cbd5e1;
            font-size: 13.5px;
        }
    `;
    document.head.appendChild(style);

    // Giao diện (đã thêm Logo, bỏ nút Key)
    const root = document.createElement('div');
    root.id = 'ms-root';
    root.innerHTML = `
        <div id="ms-card">
            <div id="ms-header" title="Giữ chuột để kéo di chuyển">
                <div class="ms-brand">
                    <div class="ms-logo-wrap">
                        <img class="ms-logo" src="${LOGO_URL}" alt="Logo" />
                        <span id="ms-dot" class="ms-dot" title="Chưa kết nối màn hình"></span>
                    </div>
                    <span>AI Solver</span>
                </div>
                <div class="ms-actions">
                    <button id="ms-solve-btn" class="ms-btn ms-btn-primary" title="Phím tắt: Alt + G">Giải</button>
                    <button id="ms-toggle-btn" class="ms-btn ms-btn-icon" title="Thu gọn / Mở rộng" style="display:none;">▾</button>
                </div>
            </div>
            <div id="ms-body">
                <div id="ms-result"></div>
                <div id="ms-footer">
                    <span>Phím tắt: <b>Alt + G</b></span>
                    <button id="ms-copy-btn" class="ms-btn ms-btn-icon" style="width:auto;padding:0 8px;height:24px;font-size:11.5px;" title="Sao chép đáp án">📋 Copy</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    const header = root.querySelector('#ms-header');
    const dot = root.querySelector('#ms-dot');
    const solveBtn = root.querySelector('#ms-solve-btn');
    const toggleBtn = root.querySelector('#ms-toggle-btn');
    const bodyEl = root.querySelector('#ms-body');
    const resultEl = root.querySelector('#ms-result');
    const copyBtn = root.querySelector('#ms-copy-btn');

    // Kéo thả tự do
    let isDragging = false, startX = 0, startY = 0, initLeft = 0, initTop = 0;
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        const rect = root.getBoundingClientRect();
        root.style.left = rect.left + 'px';
        root.style.top = rect.top + 'px';
        root.style.right = 'auto';
        startX = e.clientX;
        startY = e.clientY;
        initLeft = rect.left;
        initTop = rect.top;
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        root.style.left = Math.max(0, Math.min(window.innerWidth - root.offsetWidth, initLeft + dx)) + 'px';
        root.style.top = Math.max(0, Math.min(window.innerHeight - 50, initTop + dy)) + 'px';
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    function setPanelOpen(open) {
        bodyEl.classList.toggle('open', open);
        toggleBtn.style.display = 'inline-flex';
        toggleBtn.textContent = open ? '▴' : '▾';
    }

    toggleBtn.addEventListener('click', () => {
        setPanelOpen(!bodyEl.classList.contains('open'));
    });

    copyBtn.addEventListener('click', () => {
        if (!lastRawAnswer) return;
        navigator.clipboard.writeText(lastRawAnswer).then(() => {
            copyBtn.textContent = '✓ Đã chép';
            setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
        });
    });

    function renderFormattedAnswer(text) {
        lastRawAnswer = text;
        let cleaned = text
            .replace(/\$\$([\s\S]*?)\$\$/g, (m, p1) => '$$' + p1.replace(/\n/g, ' ').trim() + '$$')
            .replace(/\\\[([\s\S]*?)\\\]/g, (m, p1) => '\\[' + p1.replace(/\n/g, ' ').trim() + '\\]');

        let safeHtml = cleaned
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fbbf24;">$1</strong>')
            .replace(/\n/g, '<br>');

        resultEl.innerHTML = safeHtml;

        if (typeof renderMathInElement === 'function') {
            renderMathInElement(resultEl, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        }
    }

    // Chụp màn hình và nén về tối đa 1280px để tiết kiệm token
    async function captureTabScreen() {
        if (!screenStream || !screenStream.active) {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'browser' },
                audio: false,
                preferCurrentTab: true
            });

            dot.classList.add('active');
            dot.title = 'Đã kết nối màn hình (sẵn sàng chụp nhanh)';
            screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                dot.classList.remove('active');
                dot.title = 'Chưa kết nối màn hình';
            });

            captureVideo = document.createElement('video');
            captureVideo.srcObject = screenStream;
            captureVideo.muted = true;
            await captureVideo.play();
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        root.style.display = 'none';
        await new Promise(resolve => setTimeout(resolve, 120));

        const scale = Math.min(1, 1280 / captureVideo.videoWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(captureVideo.videoWidth * scale);
        canvas.height = Math.round(captureVideo.videoHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(captureVideo, 0, 0, canvas.width, canvas.height);

        root.style.display = 'block';
        return canvas.toDataURL('image/jpeg', 0.7);
    }

    // Gửi API kèm tự động chờ 2s và đổi model dự phòng khi gặp lỗi 429
    function sendRequest(dataUrl, attempt = 0) {
        const currentModel = MODELS[attempt % MODELS.length];
        const payload = {
            model: currentModel,
            max_tokens: 2048,
            temperature: 0.1,
            messages: [
                {
                    role: 'system',
                    content: 'Bạn là trợ lý giải bài tập phổ thông (Toán, Tiếng Anh, Lý, Hóa...) chính xác và siêu ngắn gọn bằng tiếng Việt. Nếu là câu trắc nghiệm hoặc sắp xếp câu, chỉ ghi thẳng **Đáp án:** đúng. Nếu là bài tự luận/Toán, chỉ dùng biến đổi sơ cấp phổ thông nối tiếp bằng dấu "=" (dùng LaTeX $...$ trên 1 dòng), tuyệt đối không dùng kiến thức đại học, rồi chốt **Đáp án:** ở dòng cuối.'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Đọc câu hỏi trong ảnh và đưa ra đáp án chính xác, ngắn gọn nhất.' },
                        { type: 'image_url', image_url: { url: dataUrl } }
                    ]
                }
            ]
        };

        GM_xmlhttpRequest({
            method: 'POST',
            anonymous: true,
            url: API_URL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            data: JSON.stringify(payload),
            timeout: 45000,
            onload: function (res) {
                // Tự động thử lại tối đa 2 lần nếu gặp lỗi 429 (Rate limit)
                if (res.status === 429 && attempt < 2) {
                    resultEl.innerHTML = `<div class="ms-loading-box"><span class="ms-spinner"></span> Quá tải (429), tự động thử lại sau 2 giây...</div>`;
                    setTimeout(() => sendRequest(dataUrl, attempt + 1), 2200);
                    return;
                }

                solveBtn.disabled = false;
                solveBtn.textContent = 'Giải';

                if (res.status < 200 || res.status >= 300) {
                    resultEl.textContent = `Lỗi HTTP ${res.status}: ${res.responseText.slice(0, 300)}`;
                    return;
                }

                try {
                    const data = JSON.parse(res.responseText);
                    if (data.error) {
                        resultEl.textContent = `Lỗi API: ${data.error.message || JSON.stringify(data.error)}`;
                        return;
                    }
                    const answer = data?.choices?.[0]?.message?.content;
                    if (answer) {
                        renderFormattedAnswer(answer);
                    } else {
                        resultEl.textContent = 'Không nhận được nội dung trả về.';
                    }
                } catch (err) {
                    resultEl.textContent = `Lỗi đọc phản hồi (${res.status}): ${res.responseText.slice(0, 200)}`;
                }
            },
            onerror: function () {
                solveBtn.disabled = false;
                solveBtn.textContent = 'Giải';
                resultEl.textContent = 'Lỗi kết nối đến Mistral AI.';
            },
            ontimeout: function () {
                solveBtn.disabled = false;
                solveBtn.textContent = 'Giải';
                resultEl.textContent = 'Hết thời gian chờ phản hồi từ máy chủ.';
            }
        });
    }

    async function handleSolve() {
        if (solveBtn.disabled) return;
        if (!API_KEY) {
            setPanelOpen(true);
            resultEl.textContent = 'Chưa cấu hình API Key trong script Tampermonkey.';
            return;
        }

        solveBtn.disabled = true;
        solveBtn.innerHTML = '<span class="ms-spinner"></span> Chụp...';

        try {
            const dataUrl = await captureTabScreen();
            setPanelOpen(true);
            solveBtn.innerHTML = '<span class="ms-spinner"></span> Giải...';
            resultEl.innerHTML = '<div class="ms-loading-box"><span class="ms-spinner"></span> Đang phân tích và giải đề...</div>';
            sendRequest(dataUrl, 0);
        } catch (err) {
            root.style.display = 'block';
            solveBtn.disabled = false;
            solveBtn.textContent = 'Giải';
            setPanelOpen(true);
            resultEl.textContent = `Đã hủy hoặc lỗi chụp màn hình: ${err.message}`;
        }
    }

    solveBtn.addEventListener('click', handleSolve);

    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            handleSolve();
        }
    });
};
