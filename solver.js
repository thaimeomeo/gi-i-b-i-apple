window.initMistralSolver = function (config) {
    'use strict';

    if (window.top !== window.self) return;

    const API_KEY = config.apiKey || '';
    const LOGO_URL = config.logoUrl || 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png';
    const FB_URL = config.fbUrl || 'https://facebook.com';
    const API_URL = 'https://api.mistral.ai/v1/chat/completions';
    const MODELS = ['pixtral-12b-2409', 'mistral-small-latest'];

    const SUBJECTS = [
        { id: 'toan', label: 'Toán' },
        { id: 'tin', label: 'Tin' },
        { id: 'anh', label: 'Anh' },
        { id: 'ly', label: 'Lý' },
        { id: 'hoa', label: 'Hóa' }
    ];

    const SUBJECT_PROMPTS = {
        toan: 'Bạn là trợ lý giải Toán THPT chính xác và siêu ngắn gọn bằng tiếng Việt. Nếu là trắc nghiệm, chỉ ghi thẳng **Đáp án:** đúng. Nếu là tự luận, chỉ dùng biến đổi sơ cấp phổ thông nối tiếp bằng dấu "=" (dùng LaTeX $...$ trên 1 dòng), tuyệt đối không dùng kiến thức đại học, rồi chốt **Đáp án:** ở dòng cuối.',
        tin: 'Bạn là trợ lý Tin học THPT (C++, Python, thuật toán, lý thuyết Tin) chính xác và ngắn gọn bằng tiếng Việt. Nếu là câu trắc nghiệm hoặc tìm kết quả chạy chương trình, ghi ngắn gọn quá trình tính rồi chốt **Đáp án:**. Nếu là bài yêu cầu viết code, đưa ra đoạn code ngắn gọn, tối ưu nhất rồi chốt **Đáp án:** ở dòng cuối.',
        anh: 'Bạn là trợ lý Tiếng Anh THPT chính xác và siêu ngắn gọn. Nếu là câu trắc nghiệm, điền từ, sửa lỗi sai hoặc sắp xếp câu, giải thích ngữ pháp/từ vựng cực ngắn (tối đa 1 dòng bằng tiếng Việt) rồi chốt thẳng **Đáp án:** ở dòng cuối.',
        ly: 'Bạn là trợ lý Vật Lý THPT chính xác và ngắn gọn bằng tiếng Việt. Nếu là câu lý thuyết/trắc nghiệm, chốt thẳng **Đáp án:**. Nếu là bài tập tính toán, ghi ngắn gọn công thức (dùng LaTeX $...$), chú ý đổi đơn vị chuẩn SI, thay số rồi chốt **Đáp án:** ở dòng cuối.',
        hoa: 'Bạn là trợ lý Hóa học THPT chính xác và ngắn gọn bằng tiếng Việt. Nếu là câu lý thuyết/trắc nghiệm, chốt thẳng **Đáp án:**. Nếu là bài tập tính toán, viết phương trình hóa học đã cân bằng, tính số mol ngắn gọn (dùng LaTeX $...$) rồi chốt **Đáp án:** ở dòng cuối.'
    };

    let currentSubject = 'toan';
    try {
        const saved = localStorage.getItem('ms_selected_subject');
        if (saved && SUBJECT_PROMPTS[saved]) currentSubject = saved;
    } catch (e) {}

    let screenStream = null;
    let captureVideo = null;
    let lastRawAnswer = '';

    // Nạp CSS KaTeX
    const katexCss = document.createElement('link');
    katexCss.rel = 'stylesheet';
    katexCss.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
    document.head.appendChild(katexCss);

    // CSS giao diện
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
            gap: 10px;
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
            width: 72px;
            background: transparent;
            border: none;
            overflow: visible;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ms-img-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
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

        /* Hàng chọn môn học */
        .ms-subject-row {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
        }
        .ms-subj-btn {
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.06);
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 0;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: center;
        }
        .ms-subj-btn:hover {
            background: rgba(255, 255, 255, 0.14);
            color: #fff;
        }
        .ms-subj-btn.active {
            background: linear-gradient(135deg, #f97316, #ea580c);
            border-color: rgba(251, 146, 60, 0.6);
            color: #ffffff;
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.35);
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
        #ms-card.minimized .ms-subject-row,
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

    const subjectButtonsHtml = SUBJECTS.map(s =>
        `<button class="ms-subj-btn${s.id === currentSubject ? ' active' : ''}" data-subject="${s.id}">${s.label}</button>`
    ).join('');

    // Cấu trúc HTML
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
            <div class="ms-subject-row" id="ms-subject-row">
                ${subjectButtonsHtml}
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
    const subjectRow = root.querySelector('#ms-subject-row');
    const resultEl = root.querySelector('#ms-result');
    const copyBtn = root.querySelector('#ms-copy-btn');

    // Chọn môn học
    subjectRow.addEventListener('click', (e) => {
        const btn = e.target.closest('.ms-subj-btn');
        if (!btn) return;
        currentSubject = btn.dataset.subject;
        subjectRow.querySelectorAll('.ms-subj-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        try {
            localStorage.setItem('ms_selected_subject', currentSubject);
        } catch (err) {}
    });

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

    // Copy chỉ lấy phần đáp án
    copyBtn.addEventListener('click', () => {
        if (!lastRawAnswer) return;
        let textToCopy = lastRawAnswer;

        const match = textToCopy.match(/(?:\*\*)?Đáp án\s*:?(?:\*\*)?\s*([\s\S]*)$/i);
        if (match && match[1].trim()) {
            textToCopy = match[1];
        }

        textToCopy = textToCopy.replace(/\*\*/g, '').trim();

        navigator.clipboard.writeText(textToCopy).then(() => {
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
        const subjectObj = SUBJECTS.find(s => s.id === currentSubject) || SUBJECTS[0];
        const systemPrompt = SUBJECT_PROMPTS[currentSubject] || SUBJECT_PROMPTS.toan;

        const payload = {
            model: currentModel,
            max_tokens: 2048,
            temperature: 0.1,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Đọc câu hỏi môn ${subjectObj.label} trong ảnh và đưa ra đáp án chính xác, ngắn gọn nhất.` },
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
            const subjectObj = SUBJECTS.find(s => s.id === currentSubject) || SUBJECTS[0];
            solveBtn.innerHTML = '<span class="ms-spinner"></span> Giải...';
            resultEl.innerHTML = `<div class="ms-loading-box"><span class="ms-spinner"></span> AppleMEOMEO đang giải ${subjectObj.label}, đợi bố tý...</div>`;
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
