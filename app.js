const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const analysisViewButton = document.querySelector("#analysisViewButton");
const dashboardViewButton = document.querySelector("#dashboardViewButton");
const backToAnalysisButton = document.querySelector("#backToAnalysisButton");
const analysisView = document.querySelector("#analysisView");
const dashboardView = document.querySelector("#dashboardView");
const currentTeacherLabel = document.querySelector("#currentTeacherLabel");
const currentOrganizationLabel = document.querySelector("#currentOrganizationLabel");
const teacherAliasInput = document.querySelector("#teacherAliasInput");
const saveTeacherButton = document.querySelector("#saveTeacherButton");
const organizationForm = document.querySelector("#organizationForm");
const saveOrganizationButton = document.querySelector("#saveOrganizationButton");
const clearOrganizationButton = document.querySelector("#clearOrganizationButton");
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
const reportMeta = document.querySelector("#reportMeta");
const reportMetaContentType = document.querySelector("#reportMetaContentType");
const reportMetaTeacher = document.querySelector("#reportMetaTeacher");
const reportMetaCreatedAt = document.querySelector("#reportMetaCreatedAt");
const copyReportButton = document.querySelector("#copyReportButton");
const printReportButton = document.querySelector("#printReportButton");
const resetButton = document.querySelector("#resetButton");
const contentTypeSelect = document.querySelector("#contentType");
const todayCount = document.querySelector("#todayCount");
const totalCount = document.querySelector("#totalCount");
const riskCount = document.querySelector("#riskCount");
const typeStatsList = document.querySelector("#typeStatsList");
const recentRecordsBody = document.querySelector("#recentRecordsBody");
const teacherFilterSelect = document.querySelector("#teacherFilterSelect");
const refreshStatsButton = document.querySelector("#refreshStatsButton");
const exportStatsButton = document.querySelector("#exportStatsButton");
const clearStatsButton = document.querySelector("#clearStatsButton");
const clearCurrentTeacherStatsButton = document.querySelector("#clearCurrentTeacherStatsButton");
const overviewOrganizationName = document.querySelector("#overviewOrganizationName");
const overviewOrganizationType = document.querySelector("#overviewOrganizationType");
const overviewUsageScenario = document.querySelector("#overviewUsageScenario");
const overviewTeacherAlias = document.querySelector("#overviewTeacherAlias");
const overviewTotalCount = document.querySelector("#overviewTotalCount");

const accessStateKey = "xinling_access_ok";
const accessCodeKey = "xinling_access_code";
const usageRecordsKey = "soul_painting_usage_records";
const currentTeacherKey = "soul_painting_current_teacher";
const organizationProfileKey = "soul_painting_organization_profile";
const maxImageSize = 5 * 1024 * 1024;
let selectedFile = null;
let selectedDataUrl = "";
let lastReportText = "";
let lastReportMeta = null;
let isSubmitting = false;

const contentConfig = {
  心灵对话: { button: "生成心灵对话", title: "心灵对话", waiting: "正在生成心灵对话，请稍等。", done: "心灵对话已生成。" },
  教师专业观察报告: { button: "生成专业观察报告", title: "房树人绘画心理观察辅助报告", waiting: "正在生成专业观察报告，请稍等。", done: "专业观察报告已生成。" },
  后续访谈问题: { button: "生成访谈问题", title: "后续访谈问题建议", waiting: "正在生成访谈问题建议，请稍等。", done: "访谈问题建议已生成。" },
  家校沟通建议: { button: "生成家校沟通建议", title: "家校沟通建议", waiting: "正在生成家校沟通建议，请稍等。", done: "家校沟通建议已生成。" },
  辅导记录初稿: { button: "生成辅导记录初稿", title: "心理辅导记录初稿", waiting: "正在生成辅导记录初稿，请稍等。", done: "辅导记录初稿已生成。" },
  风险提示与转介建议: { button: "生成风险提示与转介建议", title: "风险提示与转介建议", waiting: "正在生成风险提示与转介建议，请稍等。", done: "风险提示与转介建议已生成。" },
};

const contentTypes = Object.keys(contentConfig);

function normalizeTeacherAlias(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "未设置";
}

function getCurrentTeacher() {
  return normalizeTeacherAlias(localStorage.getItem(currentTeacherKey));
}

function saveCurrentTeacher(value) {
  const alias = normalizeTeacherAlias(value);
  if (alias === "未设置") localStorage.removeItem(currentTeacherKey);
  else localStorage.setItem(currentTeacherKey, alias);
  renderCurrentTeacher();
  applyOrganizationProfileToUI();
  renderUsageStats();
}

function renderCurrentTeacher() {
  const alias = getCurrentTeacher();
  currentTeacherLabel.textContent = alias;
  teacherAliasInput.value = alias === "未设置" ? "" : alias;
}

function sanitizeText(value) {
  return String(value || "").trim().slice(0, 120);
}

function getOrganizationProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(organizationProfileKey) || "{}");
    return {
      organizationName: sanitizeText(saved.organizationName),
      organizationType: sanitizeText(saved.organizationType),
      usageScenario: sanitizeText(saved.usageScenario),
      reportSignature: sanitizeText(saved.reportSignature),
      organizationNote: sanitizeText(saved.organizationNote),
    };
  } catch {
    return {
      organizationName: "",
      organizationType: "",
      usageScenario: "",
      reportSignature: "",
      organizationNote: "",
    };
  }
}

function hasOrganizationProfile(profile = getOrganizationProfile()) {
  return Boolean(profile.organizationName || profile.organizationType || profile.usageScenario || profile.reportSignature || profile.organizationNote);
}

function saveOrganizationProfile() {
  const formData = new FormData(organizationForm);
  const profile = {
    organizationName: sanitizeText(formData.get("organizationName")),
    organizationType: sanitizeText(formData.get("organizationType")),
    usageScenario: sanitizeText(formData.get("usageScenario")),
    reportSignature: sanitizeText(formData.get("reportSignature")),
    organizationNote: sanitizeText(formData.get("organizationNote")),
  };

  if (hasOrganizationProfile(profile)) localStorage.setItem(organizationProfileKey, JSON.stringify(profile));
  else localStorage.removeItem(organizationProfileKey);
  applyOrganizationProfileToUI();
}

function clearOrganizationProfile() {
  localStorage.removeItem(organizationProfileKey);
  renderOrganizationProfile();
  applyOrganizationProfileToUI();
}

function renderOrganizationProfile() {
  const profile = getOrganizationProfile();
  organizationForm.organizationName.value = profile.organizationName;
  organizationForm.organizationType.value = profile.organizationType;
  organizationForm.usageScenario.value = profile.usageScenario;
  organizationForm.reportSignature.value = profile.reportSignature;
  organizationForm.organizationNote.value = profile.organizationNote;
}

function applyOrganizationProfileToUI() {
  const profile = getOrganizationProfile();
  const organizationName = profile.organizationName || "未设置机构信息";
  currentOrganizationLabel.textContent = organizationName;
  overviewOrganizationName.textContent = organizationName;
  overviewOrganizationType.textContent = profile.organizationType || "未设置";
  overviewUsageScenario.textContent = profile.usageScenario || "未设置";
  overviewTeacherAlias.textContent = getCurrentTeacher();
  overviewTotalCount.textContent = getUsageRecords().length;
  renderOrganizationProfile();
  renderReportMeta();
}

function renderReportMeta(meta = lastReportMeta) {
  const organization = getOrganizationProfile();
  const contentType = meta?.contentType || getCurrentConfig().title || "未生成";
  const createdAt = meta?.createdAt ? formatRecordTime(meta.createdAt) : "未生成";
  const rows = [];

  if (organization.organizationName) {
    rows.push(["机构名称", organization.organizationName]);
  }
  rows.push(["报告用途", "绘画表达观察与学校心理辅导参考"]);
  rows.push(["生成类型", contentType]);
  rows.push(["当前教师", getCurrentTeacher()]);
  rows.push(["生成时间", createdAt]);

  reportMeta.innerHTML = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

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
  showAnalysisView();
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

function showAnalysisView() {
  analysisView.classList.remove("is-hidden");
  dashboardView.classList.add("is-hidden");
}

function showDashboardView() {
  analysisView.classList.add("is-hidden");
  dashboardView.classList.remove("is-hidden");
  renderUsageStats();
}

analysisViewButton.addEventListener("click", showAnalysisView);
backToAnalysisButton.addEventListener("click", showAnalysisView);
dashboardViewButton.addEventListener("click", showDashboardView);
saveTeacherButton.addEventListener("click", () => saveCurrentTeacher(teacherAliasInput.value));
teacherAliasInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveCurrentTeacher(teacherAliasInput.value);
});
saveOrganizationButton.addEventListener("click", saveOrganizationProfile);
clearOrganizationButton.addEventListener("click", () => {
  if (confirm("确定要清空本浏览器中的机构信息吗？这不会影响教师身份和使用统计记录。")) {
    clearOrganizationProfile();
  }
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

function createUsageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeContentType(value) {
  return contentTypes.includes(value) ? value : "心灵对话";
}

function getSelectedTeacherFilter() {
  return teacherFilterSelect.value || "全部教师";
}

function isToday(isoTime) {
  const date = new Date(isoTime);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function getUsageRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(usageRecordsKey) || "[]");
    if (!Array.isArray(parsed)) return [];

    // 只保留安全元数据字段，避免旧数据或异常数据把敏感内容带入工作台。
    return parsed
      .filter((record) => record && typeof record === "object")
      .map((record) => ({
        id: String(record.id || createUsageId()),
        createdAt: String(record.createdAt || new Date().toISOString()),
        contentType: normalizeContentType(record.contentType),
        isRiskRelated: record.contentType === "风险提示与转介建议" || record.isRiskRelated === true,
        teacherAlias: normalizeTeacherAlias(record.teacherAlias),
      }));
  } catch {
    return [];
  }
}

function saveUsageRecord(contentType) {
  const safeType = normalizeContentType(contentType);
  const records = getUsageRecords();
  records.push({
    id: createUsageId(),
    createdAt: new Date().toISOString(),
    contentType: safeType,
    isRiskRelated: safeType === "风险提示与转介建议",
    teacherAlias: getCurrentTeacher(),
  });
  try {
    localStorage.setItem(usageRecordsKey, JSON.stringify(records));
  } catch {
    // 本机统计只是辅助信息，写入失败不能影响报告生成主流程。
  }
}

function getTeacherOptions(records = getUsageRecords()) {
  const names = new Set(["未设置"]);
  for (const record of records) names.add(normalizeTeacherAlias(record.teacherAlias));
  return ["全部教师", ...Array.from(names).sort((a, b) => a.localeCompare(b, "zh-CN"))];
}

function filterUsageRecordsByTeacher(records, teacherAlias) {
  if (!teacherAlias || teacherAlias === "全部教师") return records;
  return records.filter((record) => normalizeTeacherAlias(record.teacherAlias) === teacherAlias);
}

function getUsageStats(teacherAlias = "全部教师") {
  const records = filterUsageRecordsByTeacher(getUsageRecords(), teacherAlias);
  const byType = Object.fromEntries(contentTypes.map((type) => [type, 0]));
  for (const record of records) {
    byType[record.contentType] = (byType[record.contentType] || 0) + 1;
  }

  return {
    todayTotal: records.filter((record) => isToday(record.createdAt)).length,
    total: records.length,
    riskTotal: records.filter((record) => record.isRiskRelated).length,
    byType,
    recentRecords: records.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
  };
}

function formatRecordTime(isoTime) {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function renderUsageStats() {
  applyOrganizationProfileToUI();
  const previousFilter = getSelectedTeacherFilter();
  const teacherOptions = getTeacherOptions();
  teacherFilterSelect.innerHTML = "";
  for (const optionValue of teacherOptions) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    teacherFilterSelect.appendChild(option);
  }
  teacherFilterSelect.value = teacherOptions.includes(previousFilter) ? previousFilter : "全部教师";

  const stats = getUsageStats(getSelectedTeacherFilter());
  todayCount.textContent = stats.todayTotal;
  totalCount.textContent = stats.total;
  riskCount.textContent = stats.riskTotal;

  typeStatsList.innerHTML = "";
  for (const type of contentTypes) {
    const row = document.createElement("div");
    row.className = "type-row";
    const label = document.createElement("span");
    label.textContent = type;
    const value = document.createElement("strong");
    value.textContent = stats.byType[type] || 0;
    row.append(label, value);
    typeStatsList.appendChild(row);
  }

  recentRecordsBody.innerHTML = "";
  if (!stats.recentRecords.length) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 4;
    emptyCell.textContent = "暂无统计记录";
    emptyRow.appendChild(emptyCell);
    recentRecordsBody.appendChild(emptyRow);
    return;
  }

  for (const record of stats.recentRecords) {
    const row = document.createElement("tr");
    const timeCell = document.createElement("td");
    const teacherCell = document.createElement("td");
    const typeCell = document.createElement("td");
    const riskCell = document.createElement("td");
    timeCell.textContent = formatRecordTime(record.createdAt);
    teacherCell.textContent = normalizeTeacherAlias(record.teacherAlias);
    typeCell.textContent = record.contentType;
    riskCell.textContent = record.isRiskRelated ? "是" : "否";
    row.append(timeCell, teacherCell, typeCell, riskCell);
    recentRecordsBody.appendChild(row);
  }
}

function clearUsageRecords() {
  localStorage.removeItem(usageRecordsKey);
  renderUsageStats();
}

function exportUsageRecords() {
  const teacherFilter = getSelectedTeacherFilter();
  const records = filterUsageRecordsByTeacher(getUsageRecords(), teacherFilter);
  const payload = {
    exportedAt: new Date().toISOString(),
    teacherFilter,
    note: "仅包含本浏览器中的安全使用统计元数据，不包含学生资料、图片或报告正文。",
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `soul-painting-usage-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  lastReportMeta = {
    contentType: contentTypeSelect.value,
    createdAt: new Date().toISOString(),
  };
  renderReportMeta();
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
  const teacherProfile = getTeacherProfile();
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
        profile: teacherProfile,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "OpenAI API 调用失败，请稍后再试。");

    renderReport(data);
    saveUsageRecord(teacherProfile.contentType);
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

refreshStatsButton.addEventListener("click", renderUsageStats);
teacherFilterSelect.addEventListener("change", renderUsageStats);
exportStatsButton.addEventListener("click", exportUsageRecords);
clearStatsButton.addEventListener("click", () => {
  if (confirm("确定要清空本浏览器中的所有使用统计吗？此操作不会删除学生资料或报告正文，因为系统本来就没有保存这些内容；但统计次数将无法恢复。")) {
    clearUsageRecords();
  }
});
clearCurrentTeacherStatsButton.addEventListener("click", () => {
  const teacherFilter = getSelectedTeacherFilter();
  if (teacherFilter === "全部教师") {
    alert("请先在教师筛选中选择某一位教师，再清空该教师统计。");
    return;
  }
  if (!confirm(`确定要清空“${teacherFilter}”在本浏览器中的使用统计吗？此操作无法恢复。`)) return;
  const remainingRecords = getUsageRecords().filter((record) => normalizeTeacherAlias(record.teacherAlias) !== teacherFilter);
  localStorage.setItem(usageRecordsKey, JSON.stringify(remainingRecords));
  renderUsageStats();
});

function resetWorkspace() {
  artworkInput.value = "";
  profileForm.reset();
  selectedFile = null;
  selectedDataUrl = "";
  lastReportText = "";
  lastReportMeta = null;
  previewImage.removeAttribute("src");
  reportImage.removeAttribute("src");
  previewWrap.classList.add("is-hidden");
  dropZone.classList.remove("is-hidden");
  loadingCard.classList.add("is-hidden");
  reportCard.classList.add("is-hidden");
  isSubmitting = false;
  analyzeButton.disabled = true;
  reportTitle.textContent = "房树人绘画心理观察辅助报告";
  renderReportMeta();
  updateGenerateLabels();
  setStatus("请先上传图画，并补充必填记录信息。");
}

updateGenerateLabels();
renderCurrentTeacher();
applyOrganizationProfileToUI();
restoreAccess();
