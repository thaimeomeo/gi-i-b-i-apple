window.initMistralSolver = function (config) {
    'use strict';

    if (window.top !== window.self) return;

    const API_KEY = config.apiKey || '';
    const LOGO_URL = config.logoUrl || 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png';
    const FB_URL = config.fbUrl || 'https://facebook.com';
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

    // CSS giao diện theo bố cục mới
    const style = document.createElement('style');
    style.textContent = `
        #ms-root {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            width: 340px;
            color: #f8fafc;
            user-select: none;
        }
        #ms-card {
            background: rgba(15, 23, 42, 0.86);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1.5px solid rgba(255, 255, 255, 0.18);
            border-radius: 24px;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            position: relative;
        }
        #ms-header {
            text-align: center;
            cursor: grab;
            padding: 2px 24px 4px;
            position: relative;
        }
        #ms-header:active { cursor: grabbing; }
        .ms-title-main {
            font-size: 16px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.4px;
            line-height: 1.25;
        }
        .ms-title-sub {
            font-size: 13px;
            font-weight: 700;
            background: linear-gradient(90deg, #fb923c, #facc15);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 0.8px;
            margin-top: 2px;
        }
        #ms-min-btn {
            position: absolute;
            top: 0;
            right: 0;
            width: 24px;
            height: 24px;
            border: none;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.08);
            color: #cbd5e1;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #ms-min-btn:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }

        /* Hàng giữa: Nút Giải (trái) + Ảnh Logo (phải) */
        .ms-top-row {
            display: flex;
            align-items: stretch;
            justify-content: space-between;
            gap: 12px;
            height: 52px;
        }
        #ms-solve-btn {
            flex: 1;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg, #f97316, #ea580c);
            color: #fff;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4);
            transition: all 0.18s ease;
        }
        #ms-solve-btn:hover:not(:disabled) {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }
        #ms-solve-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        .ms-img-box {
            width: 96px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.14);
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ms-img-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .ms-dot {
            position: absolute;
            top: 5px;
            right: 5px;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #64748b;
            border: 1.5px solid #0f172a;
            transition: all 0.3s ease;
        }
        .ms-dot.active {
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
        }

        /* Khung nội dung lớn ở giữa */
        #ms-result {
            min-height: 120px;
            max-height: 300px;
            overflow-y: auto;
            overflow-x: auto;
            background: rgba(2, 6, 23, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            padding: 12px 14px;
            font-size: 14px;
            line-height: 1.6;
            color: #f1f5f9;
            word-break: break-word;
            user-select: text;
            box-sizing: border-box;
        }
        #ms-result::-webkit-scrollbar { width: 5px; height: 5px; }
        #ms-result::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
            border-radius: 99px;
        }
        .ms-placeholder {
            color: #94a3b8;
            font-style: italic;
            font-size: 13.5px;
        }

        /* Chân khung: Copy (trái) + Support: FB (phải) */
        #ms-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
            padding: 0 2px;
        }
        #ms-copy-btn {
            background: rgba(255, 255, 255, 0.08);
            color: #cbd5e1;
            border: none;
            border-radius: 7px;
            padding: 4px 8px;
            font-size: 11.5px;
            cursor: pointer;
            transition: background 0.15s;
        }
        #ms-copy-btn:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
        .ms-support a {
            color: #38bdf8;
            font-weight: 700;
            text-decoration: none;
        }
        .ms-support a:hover { text-decoration: underline; }

        /* Trạng thái thu gọn */
        #ms-card.minimized .ms-top-row,
        #ms-card.minimized #ms-result,
        #ms-card.minimized #ms-footer {
            display: none;
        }
        #ms-card.minimized {
            padding: 10px 14px;
        }

        .ms-spinner {
            width: 14px;
            height: 14px;
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
            gap: 8px;
            color: #cbd5e1;
        }
    `;
    document.head.appendChild(style);

    // Cấu trúc HTML khớp hình vẽ
    const root = document.createElement('div');
    root.id = 'ms-root';
    root.innerHTML = `
        <div id="ms-card">
            <div id="ms-header" title="Giữ chuột để kéo di chuyển">
                <div class="ms-title-main">Giải bài tập</div>
                <div class="ms-title-sub">꧁༺Apple-Dra༻꧂</div>
                <button id="ms-min-btn" title="Thu gọn / Mở rộng">−</button>
            </div>
            <div class="ms-top-row">
                <button id="ms-solve-btn" title="Phím tắt: Alt + G">Giải</button>
                <div class="ms-img-box" title="Ảnh đại diện / Trạng thái màn hình">
                    <img src="${LOGO_URL}" alt="Apple-Dra" />
                    <span id="ms-dot" class="ms-dot" title="Chưa kết nối màn hình"></span>
                </div>
            </div>
            <div id="ms-result">
                <div class="ms-placeholder">• Appledra trùm cheat</div>
            </div>
            <div id="ms-footer">
                <button id="ms-copy-btn" title="Sao chép đáp án">📋 Copy</button>
                <div class="ms-support">Support: <a href="${FB_URL}" target="_blank" rel="noopener noreferrer">FB</a></div>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    const card = root.querySelector('#ms-card');
    const header = root.querySelector('#ms-header');
    const minBtn = root.querySelector('#ms-min-btn');
    const dot = root.querySelector('#ms-dot');
    const solveBtn = root.querySelector('#ms-solve-btn');
    const resultEl = root.querySelector('#ms-result');
    const copyBtn = root.querySelector('#ms-copy-btn');

    // Thu gọn / mở rộng
    minBtn.addEventListener('click', () => {
        const isMin = card.classList.toggle('minimized');
        minBtn.textContent = isMin ? '+' : '−';
    });

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

    // Copy đáp án
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
                if (res.status === 429 && attempt < 2) {
                    resultEl.innerHTML = `<div class="ms-loading-box"><span class="ms-spinner"></span> Quá tải (429), tự thử lại sau 2 giây...</div>`;
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
            resultEl.textContent = 'Chưa cấu hình API Key trong script Tampermonkey.';
            return;
        }

        if (card.classList.contains('minimized')) {
            card.classList.remove('minimized');
            minBtn.textContent = '−';
        }

        solveBtn.disabled = true;
        solveBtn.innerHTML = '<span class="ms-spinner"></span> Chụp...';

        try {
            const dataUrl = await captureTabScreen();
            solveBtn.innerHTML = '<span class="ms-spinner"></span> Giải...';
            resultEl.innerHTML = '<div class="ms-loading-box"><span class="ms-spinner"></span> Đang phân tích và giải đề...</div>';
            sendRequest(dataUrl, 0);
        } catch (err) {
            root.style.display = 'block';
            solveBtn.disabled = false;
            solveBtn.textContent = 'Giải';
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
