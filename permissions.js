// permissions.js - LumiFlow
// =========================================
// 申请 DOWNLOAD ZIP 需要的可选权限（图片和附件所在的网站）。
// 放在独立页面里申请，因为在 popup 里弹授权窗口时，popup 会被关掉，请求可能被取消。
// =========================================

const params = new URLSearchParams(window.location.search);
const platform = params.get('platform');
const origins = ZIP_FILE_HOST_ORIGINS[platform] || [];

document.getElementById('platform-name').textContent = getAiSpeakerLabel(platform);
document.getElementById('hosts').textContent = origins
    .map(origin => origin.replace('https://*.', '').replace('/*', ''))
    .join(', ');

const allowBtn = document.getElementById('allow-btn');
const status = document.getElementById('status');

function showGranted() {
    allowBtn.disabled = true;
    allowBtn.textContent = 'Access allowed';
    status.textContent = `Done. Go back to your ${getAiSpeakerLabel(platform)} tab and click DOWNLOAD ZIP again. You can close this tab.`;
}

if (origins.length === 0) {
    allowBtn.disabled = true;
    status.textContent = 'Nothing to allow for this page.';
} else {
    chrome.permissions.contains({ origins }).then(granted => {
        if (granted) showGranted();
    });

    allowBtn.addEventListener('click', async () => {
        try {
            const granted = await chrome.permissions.request({ origins });
            if (granted) {
                showGranted();
            } else {
                status.textContent = 'Access was not allowed. Without it, the ZIP contains the conversation text only.';
            }
        } catch (error) {
            status.textContent = `Could not ask for access: ${error.message}`;
        }
    });
}
