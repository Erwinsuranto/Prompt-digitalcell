(() => {
  "use strict";

  const ROOT_ID = "but-than-cyber-root";
  const STORE_KEY = "but_than_config_secure_v1";

  if (window.__butThanLoaded || document.getElementById(ROOT_ID)) return;
  window.__butThanLoaded = true;

  const DEFAULTS = {
    workspaceIds: "ca0e29ed-a54c-42d9-a50b-2ba5e065296d",
    intervalMs: 1500,
    maxRetries: 3,
    retryBackoffMs: 5000,
    sessionPollMs: 20000,
    panelWidth: 420,
    maxTotalAttempts: 1000000,
    concurrentBatchSize: 100,
    autoRequest: true,
    panelOpen: true,
    scanSectionOpen: false
  };

  const STATE = {
    at: "",
    session: null,
    deviceId: makeUuidV4(),
    autoRan: false,
    running: false,
    stopRequested: false,
    non404Errors: [],
    currentController: null
  };

  let CONFIG = { ...DEFAULTS };
  let panelEl, launcherEl, panelBody, userBarEl, wsInputEl, idOutputEl, countEl;
  let saveBtnEl, reqBtnEl, accBtnEl, stopBtnEl, autoInputEl;
  let scanOutputEl, scanCountEl, foundCountEl, foundListEl, foundContentEl, scanContentEl;

  function hasChromeStorage() {
    return typeof chrome !== "undefined" && Boolean(chrome.storage && chrome.storage.local);
  }

  function makeUuidV4() {
    const hex = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, "") : 
      Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
    const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const fixed = `${hex.slice(0, 12)}4${hex.slice(13, 16)}${variant}${hex.slice(17)}`;
    return [fixed.slice(0, 8), fixed.slice(8, 12), fixed.slice(12, 16), fixed.slice(16, 20), fixed.slice(20)].join("-");
  }

  async function loadConfig() {
    if (!hasChromeStorage()) return CONFIG;
    return new Promise(resolve => {
      chrome.storage.local.get(STORE_KEY, items => {
        resolve(items && items[STORE_KEY] ? { ...DEFAULTS, ...items[STORE_KEY] } : DEFAULTS);
      });
    });
  }

  async function saveConfig(cfg) {
    CONFIG = { ...DEFAULTS, ...cfg };
    if (hasChromeStorage()) {
      chrome.storage.local.set({ [STORE_KEY]: CONFIG });
    }
  }

  async function fetchSession() {
    const res = await fetch("/api/auth/session", { headers: { accept: "*/*" }, credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function decodeJwt(at) {
    try {
      const payload = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      const auth = payload["https://api.openai.com/auth"] || {};
      const profile = payload["https://api.openai.com/profile"] || {};
      return {
        account_id: auth.chatgpt_account_id || "",
        email: profile.email || "",
        plan_type: auth.chatgpt_plan_type || "",
        user_id: profile.user_id || payload.sub || "",
        exp: payload.exp || 0
      };
    } catch (_) { return {}; }
  }

  async function refreshSession() {
    try {
      const session = await fetchSession();
      const at = session.accessToken || "";
      if (at) {
        const changed = at !== STATE.at;
        STATE.at = at;
        STATE.session = session;
        const info = decodeJwt(at);
        if (changed) log(`[SYSTEM] Access Token Securely Loaded: ${info.email}`, "ok");
        updateUserBar(info, "ok");
        if (idOutputEl) idOutputEl.value = info.account_id || "";
        onATReady();
      } else {
        updateUserBar(null, "warn");
      }
    } catch (e) {
      log(`[ERROR] Session Sync Failed: ${e.message}`, "err");
      updateUserBar(null, "err");
    }
  }

  function getCurrentIdentity() {
    const info = STATE.at ? decodeJwt(STATE.at) : {};
    return {
      accountId: STATE.session?.account?.id || info.account_id || "",
      userId: STATE.session?.user?.id || info.user_id || "",
      email: STATE.session?.user?.email || info.email || ""
    };
  }

  async function sendOne(wsId, route, signal) {
    const url = `/backend-api/accounts/${encodeURIComponent(wsId)}/invites/${route}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          accept: "*/*",
          authorization: `Bearer ${STATE.at}`,
          "content-type": "application/json",
          "oai-device-id": STATE.deviceId
        },
        body: "",
        signal: controller.signal
      });
      return { ok: res.ok, status: res.status, body: await res.text() };
    } catch (e) {
      return { ok: false, status: e.name === "AbortError" ? -1 : 0, body: "", error: e.message };
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendWithRetries(wsId, route, signal) {
    for (let i = 0; i <= CONFIG.maxRetries; i++) {
      if (STATE.stopRequested || signal?.aborted) return false;
      log(`[EXECUTE] POST /invites/${route} -> ID: ${wsId.slice(0, 8)}... (Lần ${i + 1})`);
      const res = await sendOne(wsId, route, signal);
      if (res.ok) {
        log(`[SUCCESS] TARGET LOCKED: ${wsId} | HTTP ${res.status}`, "ok");
        return true;
      }
      if (res.status === 401 || res.status === 403) await refreshSession();
      if (i < CONFIG.maxRetries) await new Promise(r => setTimeout(r, CONFIG.retryBackoffMs));
    }
    return false;
  }

  async function runAll(route) {
    if (STATE.running) return log("[WARN] Tiến trình khác đang chạy!", "warn");
    if (!STATE.at) await refreshSession();
    const ids = wsInputEl.value.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean);
    if (!ids.length) return log("[ERR] Danh sách Workspace ID đang trống!", "err");

    STATE.running = true;
    STATE.stopRequested = false;
    const controller = new AbortController();
    STATE.currentController = controller;
    setBtns(false);
    showStopBtn(true);
    log(`[START] Khởi chạy chiến dịch: ${route.toUpperCase()} (${ids.length} mục tiêu)`, "info");

    let ok = 0;
    try {
      for (const ws of ids) {
        if (STATE.stopRequested || controller.signal.aborted) break;
        if (await sendWithRetries(ws, route, controller.signal)) ok++;
        await new Promise(r => setTimeout(r, CONFIG.intervalMs));
      }
      log(`[COMPLETE] Chiến dịch kết thúc: Thành công ${ok}/${ids.length}`, ok === ids.length ? "ok" : "warn");
    } finally {
      showStopBtn(false);
      STATE.running = false;
      setBtns(true);
    }
  }

  async function runConcurrentScan() {
    if (STATE.running) return log("[WARN] Hệ thống đang bận!", "warn");
    if (!STATE.at) await refreshSession();

    STATE.running = true;
    STATE.stopRequested = false;
    setBtns(false);
    showStopBtn(true);
    log(`[SCANNING] Kích hoạt rà quét ma trận song song: ${CONFIG.concurrentBatchSize} Threads/Batch...`, "info");

    let attempt = 0, success = false, successId = "";
    try {
      while (!success && !STATE.stopRequested && attempt < CONFIG.maxTotalAttempts) {
        const batchSize = Math.min(CONFIG.concurrentBatchSize, CONFIG.maxTotalAttempts - attempt);
        const controller = new AbortController();
        STATE.currentController = controller;
        scanCountEl.textContent = `Batch #${attempt + 1} - #${attempt + batchSize}`;

        const tasks = Array.from({ length: batchSize }, () => {
          const ws = makeUuidV4();
          return sendOne(ws, "request", controller.signal).then(res => ({ ws, res }));
        });

        const results = await Promise.all(tasks);
        attempt += batchSize;

        for (const { ws, res } of results) {
          if (res.ok) {
            success = true;
            successId = ws;
            recordNon404(res.status, ws, res.body);
            log(`[TARGET FOUND] !!! PHÁT HIỆN WORKSPACE: ${ws} !!!`, "ok");
            break;
          }
          if (res.status !== 404 && res.status !== -1) {
            recordNon404(res.status, ws, res.body);
            log(`[ANOMALY] Non-404 phát hiện: ${ws} | HTTP ${res.status}`, "warn");
          }
        }
      }
    } finally {
      showStopBtn(false);
      STATE.running = false;
      setBtns(true);
      log(`[SCAN END] Đã quét tổng cộng ${attempt} UUID.`, "info");
    }
  }

  async function leaveCurrentWorkspace() {
    if (!confirm("⚠️ CẢNH BÁO BÚT THẦN:\nBạn có chắc chắn muốn cho tài khoản hiện tại RỜI KHỎI Workspace này không?")) return;
    STATE.running = true;
    setBtns(false);
    try {
      const { accountId, userId } = getCurrentIdentity();
      if (!accountId || !userId) throw new Error("Không tìm thấy Account ID hoặc User ID");
      log(`[EXECUTE] Đang ngắt kết nối khỏi Workspace: ${accountId.slice(0,8)}...`, "warn");
      const res = await fetch(`/backend-api/accounts/${encodeURIComponent(accountId)}/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${STATE.at}`, "content-type": "application/json" }
      });
      if (res.ok) {
        log("[SUCCESS] Đã rời Workspace thành công. Hãy tải lại trang!", "ok");
      } else {
        log(`[ERR] Lỗi rời Workspace: HTTP ${res.status}`, "err");
      }
    } catch (e) {
      log(`[ERR] Ngoại lệ: ${e.message}`, "err");
    } finally {
      STATE.running = false;
      setBtns(true);
    }
  }

  function recordNon404(status, uuid, body) {
    STATE.non404Errors.push({ time: new Date().toLocaleTimeString(), status, uuid, body });
    if (foundCountEl) foundCountEl.textContent = `${STATE.non404Errors.length} mục`;
    if (foundListEl) {
      const div = document.createElement("div");
      div.className = "bt-item";
      div.innerHTML = `<span style="color:#ffd700">${uuid}</span><br><small>HTTP ${status} - ${new Date().toLocaleTimeString()}</small>`;
      foundListEl.prepend(div);
    }
  }

  function setBtns(enabled) {
    document.querySelectorAll(".bt-btn:not(#bt-stop)").forEach(b => b.disabled = !enabled);
  }

  function showStopBtn(show) {
    if (stopBtnEl) stopBtnEl.hidden = !show;
  }

  function updateUserBar(info, status) {
    if (!userBarEl) return;
    if (info && info.email) {
      userBarEl.innerHTML = `<span style="color:#00ff66">● SECURE</span> | <b>${info.email}</b> [${info.plan_type || "FREE"}]`;
    } else {
      userBarEl.innerHTML = `<span style="color:#ff3333">● DISCONNECTED</span> | Đang đồng bộ bộ nhớ...`;
    }
  }

  function log(msg, level = "info") {
    const colors = { info: "#00e5ff", ok: "#00ff66", warn: "#ffaa00", err: "#ff3333" };
    console.log(`%c[BÚT THẦN] ${msg}`, `color:${colors[level] || "#fff"};font-weight:bold;background:#111;padding:2px 6px;border-radius:3px;`);
    if (panelBody) {
      const line = document.createElement("div");
      line.style.color = colors[level] || "#ccc";
      line.style.marginBottom = "4px";
      line.style.borderBottom = "1px dashed #222";
      line.style.paddingBottom = "2px";
      line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      panelBody.appendChild(line);
      panelBody.scrollTop = panelBody.scrollHeight;
    }
  }

  function onATReady() {
    if (CONFIG.autoRequest && !STATE.autoRan && STATE.at && !STATE.running) {
      STATE.autoRan = true;
      setTimeout(() => runAll("request"), 500);
    }
  }

  function buildPanel() {
    const host = document.createElement("div");
    host.id = ROOT_ID;
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
      <style>
        :host { color-scheme: dark; font-family: 'Courier New', Courier, monospace; }
        .bt-panel {
          position: fixed; top: 15px; right: 15px; width: ${CONFIG.panelWidth}px; max-width: calc(100vw - 30px);
          background: #0a0a0a; border: 1px solid #ffd700; border-radius: 6px;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.2), inset 0 0 10px rgba(0,0,0,0.8);
          z-index: 2147483647; color: #e0e0e0; font-size: 12px; overflow: hidden;
        }
        .bt-panel[hidden], .bt-launcher[hidden] { display: none; }
        .bt-head {
          background: linear-gradient(180deg, #1f1a00 0%, #0d0b00 100%);
          border-bottom: 1px solid #ffd700; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;
        }
        .bt-title { font-weight: bold; font-size: 14px; color: #ffd700; text-shadow: 0 0 5px rgba(255,215,0,0.5); letter-spacing: 1px; }
        .bt-user { font-size: 11px; color: #aaa; margin-top: 4px; }
        .bt-launcher {
          position: fixed; top: 15px; right: 15px; z-index: 2147483647;
          background: #000; border: 1px solid #ffd700; color: #ffd700;
          padding: 8px 15px; border-radius: 4px; font-weight: bold; cursor: pointer;
          box-shadow: 0 0 10px rgba(255,215,0,0.3); font-family: inherit;
        }
        .bt-launcher:hover { background: #1a1600; box-shadow: 0 0 15px rgba(255,215,0,0.6); }
        .bt-tabs { display: grid; grid-template-columns: repeat(3, 1fr); background: #111; border-bottom: 1px solid #333; }
        .bt-tab {
          background: transparent; border: none; color: #777; padding: 10px; font-weight: bold; cursor: pointer; font-family: inherit; border-right: 1px solid #222;
        }
        .bt-tab.active { background: #1a1a1a; color: #ffd700; border-bottom: 2px solid #ffd700; }
        .bt-page { padding: 12px; background: #0f0f0f; display: none; }
        .bt-page.active { display: block; }
        .bt-ta {
          width: 100%; box-sizing: border-box; background: #050505; border: 1px solid #444; color: #00ff66;
          padding: 8px; border-radius: 4px; font-family: inherit; font-size: 11px; resize: vertical; min-height: 80px;
        }
        .bt-ta:focus { border-color: #ffd700; outline: none; box-shadow: 0 0 5px rgba(255,215,0,0.3); }
        .bt-row { display: flex; gap: 8px; margin-top: 8px; align-items: center; justify-content: space-between; }
        .bt-btn {
          background: #141414; border: 1px solid #555; color: #fff; padding: 7px 12px; border-radius: 4px;
          cursor: pointer; font-family: inherit; font-weight: bold; flex: 1; text-align: center; transition: all 0.2s;
        }
        .bt-btn:hover:not(:disabled) { border-color: #ffd700; color: #ffd700; box-shadow: 0 0 8px rgba(255,215,0,0.2); }
        .bt-btn-primary { background: #ffd700; color: #000; border-color: #ffd700; }
        .bt-btn-primary:hover:not(:disabled) { background: #e5c100; color: #000; box-shadow: 0 0 12px rgba(255,215,0,0.6); }
        .bt-btn-danger { background: #3a0000; border-color: #ff3333; color: #ff3333; }
        .bt-btn-danger:hover:not(:disabled) { background: #ff3333; color: #000; }
        .bt-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .bt-terminal {
          background: #000; border-top: 1px solid #ffd700; padding: 8px 12px; font-size: 11px;
        }
        .bt-log-screen {
          background: #050505; border: 1px solid #222; height: 130px; overflow-y: auto; padding: 6px; margin-top: 4px; border-radius: 4px;
        }
        .bt-item { background: #111; border-left: 2px solid #ffd700; padding: 6px; margin-bottom: 4px; }
      </style>

      <div class="bt-panel">
        <div class="bt-head">
          <div>
            <div class="bt-title">⚡ BÚT THẦN // CYBER CORE ⚡</div>
            <div class="bt-user" id="bt-user">Đang đồng bộ hệ thống...</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="bt-btn bt-btn-danger" id="bt-stop" style="flex:none;padding:4px 8px;" hidden> [ DỪNG ] </button>
            <button class="bt-btn" id="bt-close" style="flex:none;padding:4px 8px;">[X]</button>
          </div>
        </div>

        <div class="bt-tabs">
          <button class="bt-tab active" data-tab="join"> [ THAM GIA ] </button>
          <button class="bt-tab" data-tab="scan"> [ QUÉT UUID ] </button>
          <button class="bt-tab" data-tab="acc"> [ TÀI KHOẢN ] </button>
        </div>

        <div class="bt-page active" data-page="join">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#aaa;">
            <span>Mục tiêu (Workspace IDs):</span>
            <span id="bt-count" style="color:#ffd700;">0 ID</span>
          </div>
          <textarea class="bt-ta" id="bt-ws" spellcheck="false" placeholder="Nhập UUID vào đây, mỗi dòng 1 ID..."></textarea>
          <div class="bt-row">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="checkbox" id="bt-auto" style="accent-color:#ffd700;"> Tự động Request khi mở
            </label>
            <button class="bt-btn" id="bt-save" style="flex:none;">[ LƯU CẤU HÌNH ]</button>
          </div>
          <div class="bt-row" style="margin-top:12px;">
            <button class="bt-btn" id="bt-refresh">LÀM MỚI TOKEN</button>
            <button class="bt-btn" id="bt-accept" style="border-color:#00ff66;color:#00ff66;">CHẤP NHẬN MỜI</button>
            <button class="bt-btn bt-btn-primary" id="bt-run">XIN THAM GIA</button>
          </div>
        </div>

        <div class="bt-page" data-page="scan">
          <div style="margin-bottom:6px;color:#ffd700;">CHẾ ĐỘ QUÉT MA TRẬN SONG SONG</div>
          <textarea class="bt-ta" id="bt-scan-out" readonly style="min-height:50px;color:#00e5ff;" placeholder="Hệ thống sẵn sàng..."></textarea>
          <div class="bt-row">
            <button class="bt-btn bt-btn-primary" id="bt-bench">KÍCH HOẠT QUÉT 100 LUỒNG</button>
          </div>
          <div style="margin-top:12px;border-top:1px dashed #333;padding-top:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="color:#00ff66;">► Target Non-404 tìm thấy:</span>
              <span id="bt-found-count">0 mục</span>
            </div>
            <div id="bt-found-list" style="max-height:100px;overflow-y:auto;"></div>
          </div>
        </div>

        <div class="bt-page" data-page="acc">
          <div style="margin-bottom:4px;color:#aaa;">Account ID đang sử dụng:</div>
          <textarea class="bt-ta" id="bt-id-out" readonly style="min-height:50px;color:#fff;"></textarea>
          <div class="bt-row">
            <button class="bt-btn" id="bt-copy-id">SAO CHÉP ID</button>
            <button class="bt-btn bt-btn-danger" id="bt-leave">RỜI WORKSPACE NÀY</button>
          </div>
        </div>

        <div class="bt-terminal">
          <div style="color:#ffd700;display:flex;justify-content:space-between;">
            <span>► LIVE TERMINAL LOG</span>
            <span style="color:#00ff66;">● ONLINE</span>
          </div>
          <div class="bt-log-screen" id="bt-log-body"></div>
        </div>
      </div>
      <button class="bt-launcher" id="bt-launcher" hidden>⚡ BÚT THẦN CORE</button>
    `;

    panelEl = shadow.querySelector(".bt-panel");
    launcherEl = shadow.querySelector("#bt-launcher");
    panelBody = shadow.querySelector("#bt-log-body");
    userBarEl = shadow.querySelector("#bt-user");
    wsInputEl = shadow.querySelector("#bt-ws");
    idOutputEl = shadow.querySelector("#bt-id-out");
    countEl = shadow.querySelector("#bt-count");
    saveBtnEl = shadow.querySelector("#bt-save");
    reqBtnEl = shadow.querySelector("#bt-run");
    accBtnEl = shadow.querySelector("#bt-accept");
    stopBtnEl = shadow.querySelector("#bt-stop");
    autoInputEl = shadow.querySelector("#bt-auto");
    scanOutputEl = shadow.querySelector("#bt-scan-out");
    scanCountEl = { textContent: "" };
    foundCountEl = shadow.querySelector("#bt-found-count");
    foundListEl = shadow.querySelector("#bt-found-list");

    wsInputEl.value = CONFIG.workspaceIds;
    autoInputEl.checked = CONFIG.autoRequest;

    const updateCount = () => {
      const n = wsInputEl.value.split(/[\n,，]+/).map(s=>s.trim()).filter(Boolean).length;
      countEl.textContent = `${n} ID`;
    };
    updateCount();

    // Tabs logic
    shadow.querySelectorAll(".bt-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        shadow.querySelectorAll(".bt-tab").forEach(t => t.classList.remove("active"));
        shadow.querySelectorAll(".bt-page").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        shadow.querySelector(`.bt-page[data-page="${tab.dataset.tab}"]`).classList.add("active");
      });
    });

    // Panel Toggle
    const togglePanel = (open) => {
      panelEl.hidden = !open;
      launcherEl.hidden = open;
      saveConfig({ ...CONFIG, panelOpen: open });
    };
    shadow.querySelector("#bt-close").addEventListener("click", () => togglePanel(false));
    launcherEl.addEventListener("click", () => togglePanel(true));
    togglePanel(CONFIG.panelOpen);

    // Listeners
    wsInputEl.addEventListener("input", updateCount);
    saveBtnEl.addEventListener("click", () => {
      saveConfig({ ...CONFIG, workspaceIds: wsInputEl.value, autoRequest: autoInputEl.checked });
      log("[SYSTEM] Đã lưu cấu hình vào bộ nhớ cục bộ (Local Storage).", "ok");
      saveBtnEl.textContent = "[ ĐÃ LƯU ✔ ]";
      setTimeout(() => saveBtnEl.textContent = "[ LƯU CẤU HÌNH ]", 1500);
    });

    reqBtnEl.addEventListener("click", () => runAll("request"));
    accBtnEl.addEventListener("click", () => runAll("accept"));
    shadow.querySelector("#bt-bench").addEventListener("click", runConcurrentScan);
    shadow.querySelector("#bt-leave").addEventListener("click", leaveCurrentWorkspace);
    shadow.querySelector("#bt-refresh").addEventListener("click", () => { log("Đang đồng bộ Token...", "info"); refreshSession(); });
    shadow.querySelector("#bt-copy-id").addEventListener("click", () => {
      navigator.clipboard.writeText(idOutputEl.value);
      log("[SYSTEM] Đã sao chép Account ID vào Clipboard.", "ok");
    });
    stopBtnEl.addEventListener("click", () => {
      STATE.stopRequested = true;
      if (STATE.currentController) STATE.currentController.abort();
      log("[WARN] Đã phát lệnh KHẨN CẤP DỪNG tiến trình!", "warn");
    });

    // Message Listener từ Background
    chrome.runtime?.onMessage?.addListener((msg, _, res) => {
      if (msg?.type === "BT_TOGGLE_PANEL") {
        togglePanel(panelEl.hidden);
        res({ ok: true });
      }
    });
  }

  async function boot() {
    CONFIG = await loadConfig();
    buildPanel();
    log("SYSTEM BOOT: BÚT THẦN CYBER CORE V1.0 - ONLINE.", "ok");
    log("Chế độ bảo mật cực đại: Khóa kết nối ngoại tuyến 100%.", "info");
    await refreshSession();
    setInterval(refreshSession, CONFIG.sessionPollMs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();