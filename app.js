const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const artworkInput = document.querySelector("#artworkInput");
const dropZone = document.querySelector("#dropZone");
const previewWrap = document.querySelector("#previewWrap");
const previewImage = document.querySelector("#previewImage");
const reportImage = document.querySelector("#reportImage");
const profileForm = document.querySelector("#profileForm");
const analyzeButton = document.querySelector("#analyzeButton");
const changeImageButton = document.querySelector("#changeImageButton");
const formHint = document.querySelector("#formHint");
const loadingCard = document.querySelector("#loadingCard");
const reportCard = document.querySelector("#reportCard");
const reportContent = document.querySelector("#reportContent");
const reportTitle = document.querySelector("#reportTitle");
const copyReportButton = document.querySelector("#copyReportButton");
const printReportButton = document.querySelector("#printReportButton");
const resetButton = document.querySelector("#resetButton");
const contentTypeSelect = document.querySelector("#contentType");

const accessStateKey = "xinling_access_ok";
const accessCodeKey = "xinling_access_code";
const maxImageSize = 5 * 1024 * 1024;
let selectedFile = null;
let selectedDataUrl = "";
let lastReportText = "";
let isSubmitting = false;

const contentConfig = {
  心灵对话: { button: "生成心灵对话", title: "心灵对话", waiting: "正在生成心灵对话，请稍等。", done: "心灵对话已生成。" },
  教师专业观察报告: { button: "生成专业观察报告", title: "房树人绘画心理观察辅助报告", waiting: "正在生成专业观察报告，请稍等。", done: "专业观察报告已生成。" },
  后续访谈问题: { button: "生成访谈问题", title: "后续访谈问题建议", waiting: "正在生成访谈问题建议，请稍等。", done: "访谈问题建议已生成。" },
  家校沟通建议: { button: "生成家校沟通建议", title: "家校沟通建议", waiting: "正在生成家校沟通建议，请稍等。", done: "家校沟通建议已生成。" },
  辅导记录初稿: { button: "生成辅导记录初稿", title: "心理辅导记录初稿", waiting: "正在生成辅导记录初稿，请稍等。", done: "辅导记录初稿已生成。" },
  风险提示与转介建议: { button: "生成风险提示与转介建议", title: "风险提示与转介建议", waiting: "正在生成风险提示与转介建议，请稍等。", done: "风险提示与转介建议已生成。" },
};

function getCurrentConfig() {
  return contentConfig[contentTypeSelect.value] || contentConfig["心灵对话"];
}

function updateGenerateLabels() {
  if (isSubmitting) return;
  const config = getCurrentConfig();
  analyzeButton.textContent = config.button;
  if (!reportCard.classList.contains("is-hidden")) reportTitle.textContent = config.title;
}

function showApp() {
  loginScreen.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
}

function showLogin() {
  appShell.classList.add("is-hidden");
  loginScreen.classList.remove("is-hidden");
}

function restoreAccess() {
  if (sessionStorage.getItem(accessStateKey) === "true" && sessionStorage.getItem(accessCodeKey)) showApp();
  else showLogin();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const accessCode = String(new FormData(loginForm).get("accessCode") || "").trim();
  if (!accessCode) {
    loginMessage.textContent = "请输入内部访问码。";
    loginMessage.classList.add("error-note");
    return;
  }

  try {
    const response = await fetch("/api/verify-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "访问码不正确，请联系管理员微信 xinghaiweiguang");

    sessionStorage.setItem(accessStateKey, "true");
    sessionStorage.setItem(accessCodeKey, accessCode);
    loginMessage.textContent = "访问码验证成功，正在进入系统。";
    loginMessage.classList.remove("error-note");
    showApp();
  } catch (error) {
    loginMessage.textContent = error.message || "网络异常，请稍后再试。";
    loginMessage.classList.add("error-note");
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(accessStateKey);
  sessionStorage.removeItem(accessCodeKey);
  loginForm.reset();
  resetWorkspace();
  showLogin();
});

function setStatus(message, isError = false) {
  formHint.textContent = message;
  formHint.classList.toggle("error-note", isError);
}

function validateForm() {
  const ready = Boolean(selectedFile) && profileForm.checkValidity() && !isSubmitting;
  analyzeButton.disabled = !ready;
  return ready;
}

function validateFile(file) {
  if (!file) return "请先上传学生房树人图画照片。";
  if (!["image/jpeg", "image/png"].includes(file.type)) return "图片格式不支持，请上传 JPG、JPEG 或 PNG 格式。";
  if (file.size > maxImageSize) return "图片过大，请上传 5MB 以内的图片。";
  return "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择。"));
    reader.readAsDataURL(file);
  });
}

async function handleFile(file) {
  const error = validateFile(file);
  if (error) {
    setStatus(error, true);
    return;
  }

  selectedFile = file;
  selectedDataUrl = await readFileAsDataUrl(file);
  previewImage.src = selectedDataUrl;
  reportImage.src = selectedDataUrl;
  dropZone.classList.add("is-hidden");
  previewWrap.classList.remove("is-hidden");
  setStatus("图片已上传，请补充教师记录信息。");
  validateForm();
}

artworkInput.addEventListener("change", (event) => {
  handleFile(event.target.files[0]).catch(() => setStatus("图片预览失败，请重新上传一次。", true));
});

changeImageButton.addEventListener("click", () => {
  artworkInput.value = "";
  selectedFile = null;
  selectedDataUrl = "";
  previewImage.removeAttribute("src");
  reportImage.removeAttribute("src");
  previewWrap.classList.add("is-hidden");
  dropZone.classList.remove("is-hidden");
  analyzeButton.disabled = true;
  setStatus("请先上传图画，并补充必填记录信息。");
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  handleFile(event.dataTransfer.files[0]).catch(() => setStatus("图片预览失败，请重新上传一次。", true));
});

profileForm.addEventListener("input", validateForm);
profileForm.addEventListener("change", () => {
  validateForm();
  updateGenerateLabels();
});

function getTeacherProfile() {
  const formData = new FormData(profileForm);
  return {
    studentAlias: formData.get("studentAlias"),
    ageRange: formData.get("ageRange"),
    gender: formData.get("gender"),
    grade: formData.get("grade"),
    drawingContext: formData.get("drawingContext"),
    recentBehavior: formData.get("recentBehavior"),
    teacherConcern: formData.get("teacherConcern"),
    studentNarrative: formData.get("studentNarrative"),
    riskInfo: formData.get("riskInfo"),
    contentType: formData.get("contentType"),
  };
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  let html = "";
  let inList = false;
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
    } else if (line.startsWith("## ")) {
      closeList();
      html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
    } else if (line.startsWith("# ")) {
      closeList();
      html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${formatInline(line.replace(/^[-*]\s+/, ""))}</li>`;
    } else {
      closeList();
      html += `<p>${formatInline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

function formatInline(value) {
  return escapeHtml(value).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function renderReport(payload) {
  const config = getCurrentConfig();
  const markdown = payload?.markdown || "";
  const title = payload?.documentTitle || config.title;
  reportTitle.textContent = title;
  lastReportText = markdown || title;
  reportContent.innerHTML = markdownToHtml(markdown || `# ${title}\n\n报告暂未生成内容，请稍后再试。`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setSubmitting(submitting) {
  isSubmitting = submitting;
  analyzeButton.disabled = submitting || !selectedFile || !profileForm.checkValidity();
  analyzeButton.textContent = submitting ? "正在生成中……" : getCurrentConfig().button;
}

analyzeButton.addEventListener("click", async () => {
  if (isSubmitting) return;

  const fileError = validateFile(selectedFile);
  if (fileError) {
    setStatus(fileError, true);
    return;
  }
  if (!profileForm.checkValidity()) {
    setStatus("请补充所有必填资料，并确认三项隐私与使用声明。", true);
    profileForm.reportValidity();
    return;
  }

  const accessCode = sessionStorage.getItem(accessCodeKey);
  if (!accessCode) {
    setStatus("访问状态已失效，请重新输入内部访问码。", true);
    showLogin();
    return;
  }

  const config = getCurrentConfig();
  setSubmitting(true);
  loadingCard.classList.remove("is-hidden");
  reportCard.classList.add("is-hidden");
  setStatus(config.waiting);
  loadingCard.scrollIntoView({ behavior: "smooth", block: "center" });

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Access-Code": accessCode },
      body: JSON.stringify({
        accessCode,
        image: selectedDataUrl,
        imageType: selectedFile.type,
        profile: getTeacherProfile(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "OpenAI API 调用失败，请稍后再试。");

    renderReport(data);
    loadingCard.classList.add("is-hidden");
    reportCard.classList.remove("is-hidden");
    reportCard.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus(config.done);
  } catch (error) {
    loadingCard.classList.add("is-hidden");
    setStatus(error.message || "网络异常或服务器超时，请稍后再试。", true);
  } finally {
    setSubmitting(false);
  }
});

copyReportButton.addEventListener("click", async () => {
  if (!lastReportText) return;
  try {
    await navigator.clipboard.writeText(lastReportText);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = lastReportText;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  copyReportButton.textContent = "已复制";
  setTimeout(() => {
    copyReportButton.textContent = "复制报告";
  }, 1600);
});

printReportButton.addEventListener("click", () => window.print());

resetButton.addEventListener("click", () => {
  reportCard.classList.add("is-hidden");
  loadingCard.classList.add("is-hidden");
  validateForm();
  setStatus("可调整记录信息后重新生成。");
  document.querySelector("#uploadTitle").scrollIntoView({ behavior: "smooth", block: "start" });
});

function resetWorkspace() {
  artworkInput.value = "";
  profileForm.reset();
  selectedFile = null;
  selectedDataUrl = "";
  lastReportText = "";
  previewImage.removeAttribute("src");
  reportImage.removeAttribute("src");
  previewWrap.classList.add("is-hidden");
  dropZone.classList.remove("is-hidden");
  loadingCard.classList.add("is-hidden");
  reportCard.classList.add("is-hidden");
  isSubmitting = false;
  analyzeButton.disabled = true;
  reportTitle.textContent = "房树人绘画心理观察辅助报告";
  updateGenerateLabels();
  setStatus("请先上传图画，并补充必填记录信息。");
}

updateGenerateLabels();
restoreAccess();
