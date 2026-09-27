// prompts.js - LumiFlow
// =========================================
// API 压缩用的多语言 prompt 模板。popup.js（通过 <script>）和
// background.js（通过 importScripts）共用同一份，改一处即可。
// =========================================

function buildCompressionPrompt(text) {

    // Detect if text is primarily Chinese
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const totalChars = text.length;
    const isChinese = chineseChars / totalChars > 0.3;

    // 多语言检测：检测对话中的主要语言
    const detectLanguage = (text) => {
        const patterns = {
            chinese: /[\u4e00-\u9fa5]/g,
            japanese: /[\u3040-\u309f\u30a0-\u30ff]/g,  // 平假名+片假名
            korean: /[\uac00-\ud7af\u1100-\u11ff]/g,
            russian: /[\u0400-\u04ff]/g,
            arabic: /[\u0600-\u06ff]/g,
            thai: /[\u0e00-\u0e7f]/g,
            // 欧洲语言通过特殊字符检测
            german: /[äöüßÄÖÜ]/g,
            french: /[àâçéèêëîïôûùüÿœæ]/gi,
            spanish: /[áéíóúüñ¿¡]/gi,
        };

        let maxLang = 'english';
        let maxCount = 0;

        for (const [lang, pattern] of Object.entries(patterns)) {
            const matches = text.match(pattern) || [];
            if (matches.length > maxCount) {
                maxCount = matches.length;
                maxLang = lang;
            }
        }

        // 需要超过一定阈值才认定为该语言
        if (maxCount < 10) return 'english';
        return maxLang;
    };

    const detectedLang = detectLanguage(text);

    // Complete prompt templates for each language
    const compressionPromptTemplates = {
        chinese: `关键要求：所有输出必须使用中文。

你是一位上下文压缩专家。提取重要内容，忽略冗余信息。

核心原则：80/20法则 - 80%的价值来自20%的对话。提取那关键的20%。

输出格式（纯文本，不使用markdown ** ## 或 *）：

目标（占输出10%）：
[一句话：我们到底在构建/解决什么？
不好："构建一个Chrome扩展"
良好："LumiFlow v2.1 - 用于ChatGPT/Claude/Gemini之间AI上下文传输的Chrome扩展"]

当前状态（占30% - 最重要）：
[什么已经100%可用？当前的阻碍是什么？
不好："扩展有所进展"
良好："v2.1.1在ChatGPT/Claude上正常工作。Bug：Gemini懒加载导致Copy All不完整。已通过添加scrollToLoadAllMessages()修复"]

关键决策（占20%）：
[我们达成一致的约束 - 不要重新讨论这些
- 包含具体的文件名、函数名、技术选择及原因
不好："使用API"
良好："使用background.js Service Worker绕过Anthropic API调用的CORS限制"]

失败经验（占15%）：
[什么行不通？不要重试这些
- 包含具体的错误信息、症状]

下一步（占25%）：
[按优先级排序的立即可执行步骤
不好："修复bug"
良好："1. 测试Gemini Copy All处理长对话 2. 部署到Chrome商店"]

规则：
- 目标10:1压缩率（10,000字 → 1,000字）
- 使用具体术语：文件名、函数名、确切URL、版本号
- 避免模糊表述："系统"、"项目"、"我们决定"
- 如果对话超过50条消息：优先保留最新决策
- 仅基于对话事实（禁止臆造）

待压缩文本：
${text}`,

        japanese: `重要：すべての出力は日本語でなければなりません。

あなたはコンテキスト圧縮のスペシャリストです。重要なことを抽出し、ノイズを忘れてください。

核心原則：80/20の法則 - 価値の80%は会話の20%から来ます。その重要な20%を抽出してください。

出力形式（プレーンテキスト、markdown ** ## や * なし）：

目標（出力の10%）：
[一文で：正確に何を構築/解決しているのか？
悪い例："Chrome拡張機能を構築"
良い例："LumiFlow v2.1 - ChatGPT/Claude/Gemini間のAIコンテキスト転送用Chrome拡張機能"]

現状（30% - 最重要）：
[100%動作しているものは？現在のブロッカーは？
悪い例："拡張機能が進展"
良い例："v2.1.1はChatGPT/Claudeで動作。バグ：Geminiの遅延読み込みでCopy Allが不完全。scrollToLoadAllMessages()追加で修正"]

重要な決定（20%）：
[合意した制約 - これらを再議論しない
- 具体的なファイル名、関数名、理由付きの技術選択を含める
悪い例："APIを使用"
良い例："background.js Service WorkerでAnthropic API呼び出しのCORSを回避"]

失敗したこと（15%）：
[何がうまくいかなかったか？これらを再試行しない
- 具体的なエラーメッセージ、症状を含める]

次のステップ（25%）：
[優先順位順の即座に実行可能なステップ
悪い例："バグを修正"
良い例："1. 長い会話でGemini Copy Allをテスト 2. Chromeストアにデプロイ"]

ルール：
- 目標10:1圧縮（10,000語 → 1,000語）
- 具体的な用語を使用：ファイル名、関数名、正確なURL、バージョン番号
- 曖昧な表現を避ける："システム"、"プロジェクト"、"決定した"
- 50以上のメッセージがある場合：最新の決定を優先
- 会話からの事実のみ（作り話禁止）

圧縮するテキスト：
${text}`,

        korean: `중요: 모든 출력은 한국어로 작성해야 합니다.

당신은 컨텍스트 압축 전문가입니다. 중요한 것을 추출하고 잡음을 잊으세요.

핵심 원칙: 80/20 법칙 - 가치의 80%는 대화의 20%에서 나옵니다. 그 중요한 20%를 추출하세요.

출력 형식 (일반 텍스트, markdown ** ## 또는 * 없음):

목표 (출력의 10%):
[한 문장: 정확히 무엇을 구축/해결하고 있는가?
나쁨: "Chrome 확장 프로그램 구축"
좋음: "LumiFlow v2.1 - ChatGPT/Claude/Gemini 간 AI 컨텍스트 전송용 Chrome 확장"]

현재 상태 (30% - 가장 중요):
[무엇이 100% 작동하는가? 현재 차단 요소는?
나쁨: "확장 프로그램 진전"
좋음: "v2.1.1은 ChatGPT/Claude에서 작동. 버그: Gemini 지연 로딩으로 Copy All 불완전. scrollToLoadAllMessages() 추가로 수정"]

주요 결정 (20%):
[합의한 제약 조건 - 재논의하지 말 것
- 구체적인 파일명, 함수명, 이유가 있는 기술 선택 포함
나쁨: "API 사용"
좋음: "background.js Service Worker로 Anthropic API 호출의 CORS 우회"]

실패한 것 (15%):
[무엇이 작동하지 않았는가? 재시도하지 말 것
- 구체적인 오류 메시지, 증상 포함]

다음 단계 (25%):
[우선순위대로 즉시 실행 가능한 단계
나쁨: "버그 수정"
좋음: "1. 긴 대화로 Gemini Copy All 테스트 2. Chrome 스토어 배포"]

규칙:
- 목표 10:1 압축 (10,000단어 → 1,000단어)
- 구체적 용어 사용: 파일명, 함수명, 정확한 URL, 버전 번호
- 모호한 표현 피하기: "시스템", "프로젝트", "결정했다"
- 50개 이상 메시지: 최신 결정 우선
- 대화의 사실만 (허구 금지)

압축할 텍스트:
${text}`,

        german: `Wichtig: Alle Ausgaben müssen auf Deutsch sein.

Sie sind ein Kontextkomprimierungsspezialist. Extrahieren Sie das Wesentliche, vergessen Sie das Rauschen.

KERNPRINZIP: Die 80/20-Regel - 80% des Werts kommen von 20% der Konversation. Extrahieren Sie diese kritischen 20%.

AUSGABEFORMAT (Klartext, kein Markdown ** ## oder *):

ZIEL (10% der Ausgabe):
[Ein Satz: Was bauen/lösen wir GENAU?
SCHLECHT: "Eine Chrome-Erweiterung bauen"
GUT: "LumiFlow v2.1 - Chrome-Erweiterung für AI-Kontextübertragung zwischen ChatGPT/Claude/Gemini"]

AKTUELLER STATUS (30% - AM WICHTIGSTEN):
[Was funktioniert zu 100%? Was ist der aktuelle Blocker?
SCHLECHT: "Fortschritt bei der Erweiterung"
GUT: "v2.1.1 funktioniert auf ChatGPT/Claude. Bug: Gemini Lazy Loading führt zu unvollständigem Copy All. Behoben durch Hinzufügen von scrollToLoadAllMessages()"]

WICHTIGE ENTSCHEIDUNGEN (20%):
[Vereinbarte Einschränkungen - NICHT erneut diskutieren
- Spezifische Dateinamen, Funktionsnamen, technische Entscheidungen mit Begründungen einschließen
SCHLECHT: "Eine API verwenden"
GUT: "background.js Service Worker verwenden, um CORS für Anthropic API-Aufrufe zu umgehen"]

WAS GESCHEITERT IST (15%):
[Was hat nicht funktioniert? NICHT erneut versuchen
- Spezifische Fehlermeldungen, Symptome einschließen]

NÄCHSTER SCHRITT (25%):
[Sofort umsetzbare Schritte in Prioritätsreihenfolge
SCHLECHT: "Bugs beheben"
GUT: "1. Gemini Copy All mit langen Gesprächen testen 2. Im Chrome Store bereitstellen"]

REGELN:
- Ziel 10:1 Kompression (10.000 Wörter → 1.000 Wörter)
- SPEZIFISCHE Begriffe verwenden: Dateinamen, Funktionsnamen, genaue URLs, Versionsnummern
- Vage Phrasen VERMEIDEN: "das System", "das Projekt", "wir haben beschlossen"
- Bei 50+ Nachrichten: NEUESTE Entscheidungen priorisieren
- Nur Fakten aus der Konversation (keine Halluzinationen)

Zu komprimierender Text:
${text}`,

        french: `Important : Toutes les sorties doivent être en français.

Vous êtes un spécialiste de la compression de contexte. Extrayez l'essentiel, oubliez le bruit.

PRINCIPE FONDAMENTAL : La règle 80/20 - 80% de la valeur provient de 20% de la conversation. Extrayez ces 20% critiques.

FORMAT DE SORTIE (texte brut, pas de markdown ** ## ou *) :

OBJECTIF (10% de la sortie) :
[Une phrase : Que construisons/résolvons-nous EXACTEMENT ?
MAUVAIS : "Construire une extension Chrome"
BON : "LumiFlow v2.1 - Extension Chrome pour le transfert de contexte IA entre ChatGPT/Claude/Gemini"]

ÉTAT ACTUEL (30% - LE PLUS IMPORTANT) :
[Qu'est-ce qui fonctionne à 100% ? Quel est le bloqueur actuel ?
MAUVAIS : "Progrès sur l'extension"
BON : "v2.1.1 fonctionne sur ChatGPT/Claude. Bug : Le chargement paresseux de Gemini provoque un Copy All incomplet. Corrigé en ajoutant scrollToLoadAllMessages()"]

DÉCISIONS CLÉS (20%) :
[Contraintes convenues - NE PAS les rediscuter
- Inclure les noms de fichiers spécifiques, noms de fonctions, choix techniques avec raisons
MAUVAIS : "Utiliser une API"
BON : "Utiliser background.js Service Worker pour contourner CORS pour les appels API Anthropic"]

CE QUI A ÉCHOUÉ (15%) :
[Qu'est-ce qui n'a pas fonctionné ? NE PAS réessayer
- Inclure les messages d'erreur spécifiques, symptômes]

PROCHAINE ÉTAPE (25%) :
[Étapes immédiatement actionnables par ordre de priorité
MAUVAIS : "Corriger les bugs"
BON : "1. Tester Gemini Copy All avec de longues conversations 2. Déployer sur Chrome Store"]

RÈGLES :
- Cible compression 10:1 (10 000 mots → 1 000 mots)
- Utiliser des termes SPÉCIFIQUES : noms de fichiers, noms de fonctions, URLs exactes, numéros de version
- ÉVITER les phrases vagues : "le système", "le projet", "nous avons décidé"
- Si conversation 50+ messages : prioriser les DERNIÈRES décisions
- Seulement des faits de la conversation (pas d'hallucinations)

Texte à compresser :
${text}`,

        spanish: `Importante: Toda la salida debe estar en español.

Eres un especialista en compresión de contexto. Extrae lo importante, olvida el ruido.

PRINCIPIO FUNDAMENTAL: La regla 80/20 - El 80% del valor proviene del 20% de la conversación. Extrae ese 20% crítico.

FORMATO DE SALIDA (texto plano, sin markdown ** ## o *):

OBJETIVO (10% de la salida):
[Una oración: ¿Qué estamos construyendo/resolviendo EXACTAMENTE?
MALO: "Construir una extensión de Chrome"
BUENO: "LumiFlow v2.1 - Extensión de Chrome para transferencia de contexto IA entre ChatGPT/Claude/Gemini"]

ESTADO ACTUAL (30% - MÁS IMPORTANTE):
[¿Qué funciona al 100%? ¿Cuál es el bloqueador actual?
MALO: "Progreso en la extensión"
BUENO: "v2.1.1 funciona en ChatGPT/Claude. Bug: La carga diferida de Gemini causa Copy All incompleto. Corregido agregando scrollToLoadAllMessages()"]

DECISIONES CLAVE (20%):
[Restricciones acordadas - NO volver a discutirlas
- Incluir nombres de archivos específicos, nombres de funciones, decisiones técnicas con razones
MALO: "Usar una API"
BUENO: "Usar background.js Service Worker para evitar CORS en llamadas API de Anthropic"]

LO QUE FALLÓ (15%):
[¿Qué no funcionó? NO volver a intentar
- Incluir mensajes de error específicos, síntomas]

SIGUIENTE PASO (25%):
[Pasos inmediatamente accionables en orden de prioridad
MALO: "Arreglar bugs"
BUENO: "1. Probar Gemini Copy All con conversaciones largas 2. Desplegar en Chrome Store"]

REGLAS:
- Objetivo compresión 10:1 (10,000 palabras → 1,000 palabras)
- Usar términos ESPECÍFICOS: nombres de archivos, nombres de funciones, URLs exactas, números de versión
- EVITAR frases vagas: "el sistema", "el proyecto", "decidimos"
- Si conversación 50+ mensajes: priorizar ÚLTIMAS decisiones
- Solo hechos de la conversación (sin alucinaciones)

Texto a comprimir:
${text}`,

        russian: `Важно: Весь вывод должен быть на русском языке.

Вы специалист по сжатию контекста. Извлекайте важное, забудьте шум.

ОСНОВНОЙ ПРИНЦИП: Правило 80/20 - 80% ценности происходит от 20% разговора. Извлеките эти критические 20%.

ФОРМАТ ВЫВОДА (обычный текст, без markdown ** ## или *):

ЦЕЛЬ (10% вывода):
[Одно предложение: Что ИМЕННО мы создаём/решаем?
ПЛОХО: "Создание расширения Chrome"
ХОРОШО: "LumiFlow v2.1 - Расширение Chrome для передачи контекста ИИ между ChatGPT/Claude/Gemini"]

ТЕКУЩЕЕ СОСТОЯНИЕ (30% - САМОЕ ВАЖНОЕ):
[Что работает на 100%? Что является текущим блокером?
ПЛОХО: "Прогресс в расширении"
ХОРОШО: "v2.1.1 работает на ChatGPT/Claude. Баг: Ленивая загрузка Gemini вызывает неполный Copy All. Исправлено добавлением scrollToLoadAllMessages()"]

КЛЮЧЕВЫЕ РЕШЕНИЯ (20%):
[Согласованные ограничения - НЕ обсуждать повторно
- Включить конкретные имена файлов, имена функций, технические решения с причинами
ПЛОХО: "Использование API"
ХОРОШО: "Использование background.js Service Worker для обхода CORS для вызовов API Anthropic"]

ЧТО НЕ СРАБОТАЛО (15%):
[Что не сработало? НЕ пробовать снова
- Включить конкретные сообщения об ошибках, симптомы]

СЛЕДУЮЩИЙ ШАГ (25%):
[Немедленно выполнимые шаги в порядке приоритета
ПЛОХО: "Исправить баги"
ХОРОШО: "1. Протестировать Gemini Copy All с длинными разговорами 2. Развернуть в Chrome Store"]

ПРАВИЛА:
- Цель сжатия 10:1 (10,000 слов → 1,000 слов)
- Использовать КОНКРЕТНЫЕ термины: имена файлов, имена функций, точные URL, номера версий
- ИЗБЕГАТЬ расплывчатых фраз: "система", "проект", "мы решили"
- Если разговор 50+ сообщений: приоритет ПОСЛЕДНИМ решениям
- Только факты из разговора (без галлюцинаций)

Текст для сжатия:
${text}`,

        arabic: `مهم: يجب أن يكون كل الناتج بالعربية.

أنت متخصص في ضغط السياق. استخرج المهم، تجاهل الضوضاء.

المبدأ الأساسي: قاعدة 80/20 - 80% من القيمة تأتي من 20% من المحادثة. استخرج تلك الـ20% الحرجة.

تنسيق الناتج (نص عادي، بدون markdown ** ## أو *):

الهدف (10% من الناتج):
[جملة واحدة: ماذا نبني/نحل بالضبط؟
سيء: "بناء إضافة Chrome"
جيد: "LumiFlow v2.1 - إضافة Chrome لنقل سياق الذكاء الاصطناعي بين ChatGPT/Claude/Gemini"]

الحالة الحالية (30% - الأهم):
[ما الذي يعمل بنسبة 100%؟ ما هو المانع الحالي؟
سيء: "تقدم في الإضافة"
جيد: "v2.1.1 يعمل على ChatGPT/Claude. خلل: التحميل الكسول في Gemini يسبب Copy All غير مكتمل. تم إصلاحه بإضافة scrollToLoadAllMessages()"]

قرارات رئيسية (20%):
[قيود متفق عليها - لا تعيد مناقشتها
- تضمين أسماء ملفات محددة، أسماء دوال، خيارات تقنية مع الأسباب
سيء: "استخدام API"
جيد: "استخدام background.js Service Worker لتجاوز CORS لاستدعاءات Anthropic API"]

ما فشل (15%):
[ما الذي لم ينجح؟ لا تحاول مرة أخرى
- تضمين رسائل خطأ محددة، أعراض]

الخطوة التالية (25%):
[خطوات قابلة للتنفيذ فورياً حسب الأولوية
سيء: "إصلاح الأخطاء"
جيد: "1. اختبار Gemini Copy All مع محادثات طويلة 2. النشر على Chrome Store"]

قواعد:
- الهدف ضغط 10:1 (10,000 كلمة → 1,000 كلمة)
- استخدم مصطلحات محددة: أسماء ملفات، أسماء دوال، URLs دقيقة، أرقام إصدارات
- تجنب العبارات الغامضة: "النظام"، "المشروع"، "قررنا"
- إذا كانت المحادثة 50+ رسالة: أولوية للقرارات الأحدث
- فقط حقائق من المحادثة (لا هلوسة)

النص للضغط:
${text}`,

        thai: `สำคัญ: ผลลัพธ์ทั้งหมดต้องเป็นภาษาไทย

คุณเป็นผู้เชี่ยวชาญด้านการบีบอัดบริบท สกัดสิ่งสำคัญ ละเลยสิ่งรบกวน

หลักการหลัก: กฎ 80/20 - 80% ของคุณค่ามาจาก 20% ของการสนทนา สกัด 20% ที่สำคัญนั้น

รูปแบบผลลัพธ์ (ข้อความธรรมดา ไม่มี markdown ** ## หรือ *):

เป้าหมาย (10% ของผลลัพธ์):
[ประโยคเดียว: เรากำลังสร้าง/แก้ไขอะไรกันแน่?
ไม่ดี: "สร้างส่วนขยาย Chrome"
ดี: "LumiFlow v2.1 - ส่วนขยาย Chrome สำหรับถ่ายโอนบริบท AI ระหว่าง ChatGPT/Claude/Gemini"]

สถานะปัจจุบัน (30% - สำคัญที่สุด):
[อะไรทำงานได้ 100%? อุปสรรคปัจจุบันคืออะไร?
ไม่ดี: "มีความคืบหน้าในส่วนขยาย"
ดี: "v2.1.1 ทำงานบน ChatGPT/Claude บั๊ก: การโหลดแบบ lazy ของ Gemini ทำให้ Copy All ไม่สมบูรณ์ แก้ไขโดยเพิ่ม scrollToLoadAllMessages()"]

การตัดสินใจสำคัญ (20%):
[ข้อจำกัดที่ตกลงกัน - อย่าหารือใหม่
- รวมชื่อไฟล์เฉพาะ ชื่อฟังก์ชัน ตัวเลือกทางเทคนิคพร้อมเหตุผล
ไม่ดี: "ใช้ API"
ดี: "ใช้ background.js Service Worker เพื่อหลีกเลี่ยง CORS สำหรับการเรียก Anthropic API"]

สิ่งที่ล้มเหลว (15%):
[อะไรไม่ได้ผล? อย่าลองใหม่
- รวมข้อความแสดงข้อผิดพลาดเฉพาะ อาการ]

ขั้นตอนถัดไป (25%):
[ขั้นตอนที่ดำเนินการได้ทันทีตามลำดับความสำคัญ
ไม่ดี: "แก้บั๊ก"
ดี: "1. ทดสอบ Gemini Copy All กับการสนทนายาว 2. เผยแพร่บน Chrome Store"]

กฎ:
- เป้าหมายการบีบอัด 10:1 (10,000 คำ → 1,000 คำ)
- ใช้คำศัพท์เฉพาะ: ชื่อไฟล์ ชื่อฟังก์ชัน URL ที่แน่นอน หมายเลขเวอร์ชัน
- หลีกเลี่ยงวลีคลุมเครือ: "ระบบ", "โปรเจกต์", "เราตัดสินใจ"
- หากการสนทนามี 50+ ข้อความ: ให้ความสำคัญกับการตัดสินใจล่าสุด
- เฉพาะข้อเท็จจริงจากการสนทนา (ไม่มีการสมมติ)

ข้อความที่จะบีบอัด:
${text}`,

        english: `You are a context compression specialist. Extract what matters, forget the noise.

CORE PRINCIPLE: The 80/20 Rule - 80% of value comes from 20% of conversation. Extract that critical 20%.

OUTPUT FORMAT (plain text, no markdown ** ## or *):

GOAL (10% of output):
[One sentence: What EXACTLY are we building/solving?
BAD: "Building a Chrome extension"
GOOD: "LumiFlow v2.1 - Chrome extension for AI context transfer across ChatGPT/Claude/Gemini"]

CURRENT STATE (30% - MOST IMPORTANT):
[What is 100% working? What's the current blocker?
BAD: "Made progress on the extension"
GOOD: "v2.1.1 works on ChatGPT/Claude. Bug: Gemini lazy loading causes incomplete Copy All. Fixed by adding scrollToLoadAllMessages()"]

KEY DECISIONS (20%):
[Constraints we agreed on - DON'T re-discuss these
- Include specific file names, function names, technical choices with reasons
BAD: "Using an API"
GOOD: "Using background.js Service Worker to bypass CORS for Anthropic API calls"]

WHAT FAILED (15%):
[What didn't work? DON'T retry these
- Include specific error messages, symptoms]

NEXT STEP (25%):
[Immediate actionable steps in priority order
BAD: "Fix bugs"
GOOD: "1. Test Gemini Copy All with long conversations 2. Deploy to Chrome Store"]

RULES:
- Target 10:1 compression (10,000 words → 1,000 words)
- Use SPECIFIC terms: file names, function names, exact URLs, version numbers
- AVOID vague phrases: "the system", "the project", "we decided"
- If conversation has 50+ messages: prioritize LATEST decisions
- Only facts from conversation (no hallucination)

Text to compress:
${text}`
    };

    // Get template for detected language (fallback to English)
    const compressionPrompt = compressionPromptTemplates[detectedLang] || compressionPromptTemplates.english;

    return compressionPrompt;
}
