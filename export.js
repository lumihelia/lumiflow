// export.js - LumiFlow
// =========================================
// 导出用的共享工具：把对话排成 TXT / Markdown，以及在浏览器里直接打包 ZIP。
// popup.js（通过 <script>）和 content.js（作为 content script 先于它加载）共用。
// =========================================

function getAiSpeakerLabel(platform) {
    const names = {
        claude: 'Claude',
        chatgpt: 'ChatGPT',
        gemini: 'Gemini',
        deepseek: 'DeepSeek'
    };
    return names[platform] || 'AI';
}

function sanitizeContent(text) {
    if (!text) return '';

    return text
        // Reduce excessive newlines (3+ → 2)
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        // Remove trailing spaces only — leading spaces are code/list indentation
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');
}

// 附件在正文中的位置标记（由 content.js 在合并一轮回答时插入）
function attachmentMarker(id) {
    return `[[lumiflow-attachment:${id}]]`;
}

// 不导出附件的场景（例如 API 压缩）把位置标记换成简短说明
function replaceAttachmentMarkers(text, attachments, render) {
    const byId = new Map((attachments || []).map(a => [a.id, a]));
    return String(text || '').replace(/\[\[lumiflow-attachment:([^\]]+)\]\]/g, (match, id) => {
        const att = byId.get(id);
        return att ? render(att) : '';
    });
}

// Markdown 链接里的路径：空格、中文、括号都要编码，否则部分编辑器会把链接截断
function markdownPath(path) {
    return encodeURI(path).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

// 附件在文字里的写法。
// mediaPaths: { [attachment.id]: 'media/001-photo.png' } —— 有路径（ZIP 导出）时直接引用文件，
// 没有路径（普通 TXT / MD 导出）时留一个占位，至少让读者知道这里原本有一张图或一个文件。
function formatAttachment(att, format, mediaPaths) {
    const path = mediaPaths && mediaPaths[att.id];
    const name = att.name || (att.kind === 'image' ? 'image' : 'file');

    if (format === 'md') {
        if (path && att.kind === 'image') return `![${name}](${markdownPath(path)})`;
        if (path) return `[📎 ${name}](${markdownPath(path)})`;
        return att.kind === 'image' ? `[Image: ${name}]` : `[File: ${name}]`;
    }
    if (path) return `[${att.kind === 'image' ? 'Image' : 'File'}: ${path}]`;
    return att.kind === 'image' ? `[Image: ${name}]` : `[File: ${name}]`;
}

function formatConversation(conversation, platform, format, mediaPaths = null) {
    const aiLabel = getAiSpeakerLabel(platform);

    return conversation.map(m => {
        const speaker = m.role === 'user' ? 'User' : aiLabel;
        const all = m.attachments || [];
        const raw = String(m.content || '');
        // 正文里有位置标记的附件放回原位，其余（例如用户上传的图片）放在消息开头
        const placed = all.filter(att => raw.includes(attachmentMarker(att.id)));
        const leading = all.filter(att => !placed.includes(att));
        const text = sanitizeContent(
            replaceAttachmentMarkers(raw, placed, att => formatAttachment(att, format, mediaPaths))
        );
        const attachments = leading.map(att => formatAttachment(att, format, mediaPaths));
        const body = [...attachments, text].filter(Boolean).join('\n\n');

        if (!body) return null;

        return format === 'md'
            ? `**${speaker}:**\n\n${body}`
            : `${speaker} said:\n${body}`;
    })
        .filter(item => item !== null)
        .join('\n\n')
        .trim();
}

// ========================================
// ZIP（不压缩的 STORE 格式）
// ========================================
// 图片、PDF、Office 文件本身已经是压缩格式，再压一遍几乎不会变小，
// 所以只做打包。这样不需要引入任何第三方库，代码也方便商店审核。

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
}

// files: [{ name: 'media/001.png', data: Uint8Array | string }] → Uint8Array（完整的 .zip 文件）
function createZip(files) {
    const encoder = new TextEncoder();
    const { time, day } = dosDateTime(new Date());
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
        const nameBytes = encoder.encode(file.name);
        const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
        const crc = crc32(data);

        // Local file header
        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034B50, true);
        local.setUint16(4, 20, true);          // version needed
        local.setUint16(6, 0x0800, true);      // flags: UTF-8 file names
        local.setUint16(8, 0, true);           // method: store
        local.setUint16(10, time, true);
        local.setUint16(12, day, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);
        local.setUint32(22, data.length, true);
        local.setUint16(26, nameBytes.length, true);
        local.setUint16(28, 0, true);
        localParts.push(new Uint8Array(local.buffer), nameBytes, data);

        // Central directory entry
        const central = new DataView(new ArrayBuffer(46));
        central.setUint32(0, 0x02014B50, true);
        central.setUint16(4, 20, true);        // version made by
        central.setUint16(6, 20, true);        // version needed
        central.setUint16(8, 0x0800, true);
        central.setUint16(10, 0, true);
        central.setUint16(12, time, true);
        central.setUint16(14, day, true);
        central.setUint32(16, crc, true);
        central.setUint32(20, data.length, true);
        central.setUint32(24, data.length, true);
        central.setUint16(28, nameBytes.length, true);
        central.setUint16(30, 0, true);        // extra length
        central.setUint16(32, 0, true);        // comment length
        central.setUint16(34, 0, true);        // disk number
        central.setUint16(36, 0, true);        // internal attrs
        central.setUint32(38, 0, true);        // external attrs
        central.setUint32(42, offset, true);   // local header offset
        centralParts.push(new Uint8Array(central.buffer), nameBytes);

        offset += 30 + nameBytes.length + data.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054B50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    const parts = [...localParts, ...centralParts, new Uint8Array(end.buffer)];
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const zip = new Uint8Array(total);
    let position = 0;
    for (const part of parts) {
        zip.set(part, position);
        position += part.length;
    }
    return zip;
}

// ========================================
// 文件名
// ========================================

const MIME_EXTENSIONS = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
    'image/svg+xml': 'svg', 'image/heic': 'heic', 'application/pdf': 'pdf',
    'text/plain': 'txt', 'text/markdown': 'md', 'text/csv': 'csv', 'application/json': 'json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
};

// 'media/003-我的截图.png'：编号保证顺序和唯一，原名方便辨认
function buildMediaFileName(index, name, mimeType) {
    const safe = String(name || '')
        .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
    const hasExtension = /\.[A-Za-z0-9]{1,5}$/.test(safe);
    const ext = hasExtension ? '' : '.' + (MIME_EXTENSIONS[(mimeType || '').split(';')[0].trim()] || 'bin');
    const base = safe || (String(mimeType || '').startsWith('image/') ? 'image' : 'file');
    return `media/${String(index).padStart(3, '0')}-${base}${ext}`;
}
