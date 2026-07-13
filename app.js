const publicHomeView = document.querySelector("#publicHomeView");
const loginScreen = document.querySelector("#loginScreen");
const appShell = document.querySelector("#appShell");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");
const currentUserBadge = document.querySelector("#currentUserBadge");
const currentRoleBadge = document.querySelector("#currentRoleBadge");
const accountPanel = document.querySelector("#accountPanel");
const accountPanelTitle = document.querySelector("#accountPanelTitle");
const initialAdminEntry = document.querySelector("#initialAdminEntry");
const toggleInitialAdminButton = document.querySelector("#toggleInitialAdminButton");
const initialAdminForm = document.querySelector("#initialAdminForm");
const userLoginForm = document.querySelector("#userLoginForm");
const accountMessage = document.querySelector("#accountMessage");
const passwordChangeGate = document.querySelector("#passwordChangeGate");
const requiredPasswordChangeForm = document.querySelector("#requiredPasswordChangeForm");
const requiredPasswordChangeMessage = document.querySelector("#requiredPasswordChangeMessage");
const analysisViewButton = document.querySelector("#analysisViewButton");
const dashboardViewButton = document.querySelector("#dashboardViewButton");
const backToAnalysisButton = document.querySelector("#backToAnalysisButton");
const analysisView = document.querySelector("#analysisView");
const dashboardView = document.querySelector("#dashboardView");
const currentTeacherLabel = document.querySelector("#currentTeacherLabel");
const currentOrganizationLabel = document.querySelector("#currentOrganizationLabel");
const teacherAliasInput = document.querySelector("#teacherAliasInput");
const teacherIdentityPanel = document.querySelector("#teacherIdentityPanel");
const saveTeacherButton = document.querySelector("#saveTeacherButton");
const organizationForm = document.querySelector("#organizationForm");
const saveOrganizationButton = document.querySelector("#saveOrganizationButton");
const clearOrganizationButton = document.querySelector("#clearOrganizationButton");
const organizationMessage = document.querySelector("#organizationMessage");
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
const exportWordButton = document.querySelector("#exportWordButton");
const exportTxtButton = document.querySelector("#exportTxtButton");
const resetButton = document.querySelector("#resetButton");
const contentTypeSelect = document.querySelector("#contentType");
const todayCount = document.querySelector("#todayCount");
const totalCount = document.querySelector("#totalCount");
const riskCount = document.querySelector("#riskCount");
const riskStatCard = document.querySelector("#riskStatCard");
const typeStatsList = document.querySelector("#typeStatsList");
const recentRecordsBody = document.querySelector("#recentRecordsBody");
const teacherFilterSelect = document.querySelector("#teacherFilterSelect");
const refreshStatsButton = document.querySelector("#refreshStatsButton");
const exportStatsButton = document.querySelector("#exportStatsButton");
const exportStatsCsvButton = document.querySelector("#exportStatsCsvButton");
const teacherFilterField = document.querySelector("#teacherFilterField");
const usageDateFrom = document.querySelector("#usageDateFrom");
const usageDateTo = document.querySelector("#usageDateTo");
const usageContentTypeFilter = document.querySelector("#usageContentTypeFilter");
const teacherStatsPanel = document.querySelector("#teacherStatsPanel");
const teacherStatsList = document.querySelector("#teacherStatsList");
const providerStatsList = document.querySelector("#providerStatsList");
const providerStatsPanel = document.querySelector("#providerStatsPanel");
const clearStatsButton = document.querySelector("#clearStatsButton");
const clearCurrentTeacherStatsButton = document.querySelector("#clearCurrentTeacherStatsButton");
const overviewOrganizationName = document.querySelector("#overviewOrganizationName");
const overviewOrganizationType = document.querySelector("#overviewOrganizationType");
const overviewUsageScenario = document.querySelector("#overviewUsageScenario");
const overviewTeacherAlias = document.querySelector("#overviewTeacherAlias");
const overviewTotalCount = document.querySelector("#overviewTotalCount");
const userManagementPanel = document.querySelector("#userManagementPanel");
const accountSecurityPanel = document.querySelector("#accountSecurityPanel");
const organizationSettingsPanel = document.querySelector("#organizationSettingsPanel");
const createTeacherForm = document.querySelector("#createTeacherForm");
const createTeacherButton = document.querySelector("#createTeacherButton");
const refreshUserListButton = document.querySelector("#refreshUserListButton");
const userManagementMessage = document.querySelector("#userManagementMessage");
const userListBody = document.querySelector("#userListBody");
const accountUsernameText = document.querySelector("#accountUsernameText");
const accountDisplayNameText = document.querySelector("#accountDisplayNameText");
const accountRoleText = document.querySelector("#accountRoleText");
const accountOrganizationText = document.querySelector("#accountOrganizationText");
const accountStatusText = document.querySelector("#accountStatusText");
const changePasswordForm = document.querySelector("#changePasswordForm");
const changePasswordButton = document.querySelector("#changePasswordButton");
const changePasswordMessage = document.querySelector("#changePasswordMessage");
const resetPasswordPanel = document.querySelector("#resetPasswordPanel");
const resetPasswordTargetText = document.querySelector("#resetPasswordTargetText");
const resetPasswordForm = document.querySelector("#resetPasswordForm");
const submitResetPasswordButton = document.querySelector("#submitResetPasswordButton");
const cancelResetPasswordButton = document.querySelector("#cancelResetPasswordButton");
const resetPasswordMessage = document.querySelector("#resetPasswordMessage");
const modelSettingsPanel = document.querySelector("#modelSettingsPanel");
const modelSettingsLock = document.querySelector("#modelSettingsLock");
const modelSettingsCodeForm = document.querySelector("#modelSettingsCodeForm");
const verifyModelSettingsButton = document.querySelector("#verifyModelSettingsButton");
const modelSettingsUnlockedIntro = document.querySelector("#modelSettingsUnlockedIntro");
const modelSettingsForm = document.querySelector("#modelSettingsForm");
const modelSettingsActions = document.querySelector("#modelSettingsActions");
const reloadModelSettingsButton = document.querySelector("#reloadModelSettingsButton");
const saveModelSettingsButton = document.querySelector("#saveModelSettingsButton");
const modelSettingsMessage = document.querySelector("#modelSettingsMessage");
const modelSettingsMeta = document.querySelector("#modelSettingsMeta");
const modelProviderStatusList = document.querySelector("#modelProviderStatusList");
const testVisionModelButton = document.querySelector("#testVisionModelButton");
const testTextModelButton = document.querySelector("#testTextModelButton");
const testModelPipelineButton = document.querySelector("#testModelPipelineButton");
const systemStatusPanel = document.querySelector("#systemStatusPanel");
const systemStatusGrid = document.querySelector("#systemStatusGrid");
const refreshSystemStatusButton = document.querySelector("#refreshSystemStatusButton");
const systemStatusMessage = document.querySelector("#systemStatusMessage");
const backupPanel = document.querySelector("#backupPanel");
const createBackupButton = document.querySelector("#createBackupButton");
const refreshBackupsButton = document.querySelector("#refreshBackupsButton");
const backupListBody = document.querySelector("#backupListBody");
const restoreDatabaseForm = document.querySelector("#restoreDatabaseForm");
const restoreDatabaseButton = document.querySelector("#restoreDatabaseButton");
const restoreBackupIdInput = document.querySelector("#restoreBackupIdInput");
const restoreSelectedBackupText = document.querySelector("#restoreSelectedBackupText");
const importBackupFileInput = document.querySelector("#importBackupFileInput");
const importBackupButton = document.querySelector("#importBackupButton");
const backupMessage = document.querySelector("#backupMessage");
const internalEntryButtons = document.querySelectorAll(".internal-entry-button");
const backPublicButton = document.querySelector("#backPublicButton");

const accessStateKey = "xinling_access_ok";
const accessCodeKey = "xinling_access_code";
const adminSettingsAccessKey = "xinling_admin_settings_ok";
const cnSessionTokenKey = "xinling_cn_session_token";
const currentUserKey = "soul_painting_current_user";
const usersKey = "soul_painting_users";
const usageRecordsKey = "soul_painting_usage_records";
const currentTeacherKey = "soul_painting_current_teacher";
const organizationProfileKey = "soul_painting_organization_profile";
const maxImageSize = 5 * 1024 * 1024;
let selectedFile = null;
let selectedDataUrl = "";
let lastReportText = "";
let lastReportMeta = null;
let isSubmitting = false;
let showInitialAdminForm = false;
let cnAuthMode = false;
let cnHasAdmin = false;
let currentCnUser = null;
let cnUsers = [];
let currentCnOrganization = null;
let currentCnUsageSummary = null;
let currentCnUsageRecords = [];
let selectedRestoreBackup = null;

const contentConfig = {
  心灵对话: { button: "生成心灵对话", title: "心灵对话", waiting: "正在生成心灵对话，请稍等。", done: "心灵对话已生成。" },
  教师专业观察报告: { button: "生成专业观察报告", title: "房树人绘画心理观察辅助报告", waiting: "正在生成专业观察报告，请稍等。", done: "专业观察报告已生成。" },
  后续访谈问题: { button: "生成访谈问题", title: "后续访谈问题建议", waiting: "正在生成访谈问题建议，请稍等。", done: "访谈问题建议已生成。" },
  家校沟通建议: { button: "生成家校沟通建议", title: "家校沟通建议", waiting: "正在生成家校沟通建议，请稍等。", done: "家校沟通建议已生成。" },
  辅导记录初稿: { button: "生成辅导记录初稿", title: "心理辅导记录初稿", waiting: "正在生成辅导记录初稿，请稍等。", done: "辅导记录初稿已生成。" },
  风险提示与转介建议: { button: "生成风险提示与转介建议", title: "风险提示与转介建议", waiting: "正在生成风险提示与转介建议，请稍等。", done: "风险提示与转介建议已生成。" },
};
const contentTypes = Object.keys(contentConfig);

function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(usersKey) || "[]");
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

function createUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9_-]{3,32}$/.test(username);
}

async function hashPassword(password) {
  const text = String(password || "");
  const bytes = new TextEncoder().encode(`xinling-local-demo:${text}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password, user) {
  const passwordHash = await hashPassword(password);
  return user.passwordHash === passwordHash;
}

function getCurrentUser() {
  try {
    const current = JSON.parse(localStorage.getItem(currentUserKey) || "null");
    if (!current?.id) return null;
    return getUsers().find((user) => user.id === current.id && user.isActive !== false) || null;
  } catch {
    return null;
  }
}

function getRoleLabel(role) {
  return role === "admin" ? "管理员" : "教师";
}

function isAdmin(user = getCurrentUser()) {
  return user?.role === "admin";
}

function isTeacher(user = getCurrentUser()) {
  return user?.role === "teacher";
}

function canManageUsers() {
  return isAdmin();
}

function canEditOrganizationProfile() {
  return isAdmin();
}

function requireLogin(message = "请先登录后使用心灵画卷。") {
  const user = getCurrentUser();
  if (user) return true;
  setStatus(message, true);
  renderLoginPanel();
  return false;
}

function setCurrentUser(user) {
  localStorage.setItem(
    currentUserKey,
    JSON.stringify({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      loggedInAt: new Date().toISOString(),
    }),
  );
  localStorage.setItem(currentTeacherKey, user.displayName);
  renderCurrentUserInfo();
  renderLoginPanel();
  renderUsageStats();
}

function logoutUser() {
  localStorage.removeItem(currentUserKey);
  renderCurrentUserInfo();
  renderLoginPanel();
  showAnalysisView();
  renderUsageStats();
}

async function createInitialAdmin(formData) {
  const users = getUsers();
  if (users.length) throw new Error("本机已存在用户，请直接登录。");
  const username = normalizeUsername(formData.get("username"));
  const displayName = sanitizeText(formData.get("displayName")) || username;
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (!isValidUsername(username)) throw new Error("用户名只能包含字母、数字、下划线、短横线，长度 3-32 位。");
  if (!password) throw new Error("密码不能为空。");
  if (password !== confirmPassword) throw new Error("两次密码不一致。");

  const admin = {
    id: createUserId(),
    username,
    displayName,
    role: "admin",
    passwordHash: await hashPassword(password),
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  saveUsers([admin]);
  setCurrentUser(admin);
  return admin;
}

async function createTeacherUser(formData) {
  if (!canManageUsers()) throw new Error("只有管理员可以创建教师账号。");
  const users = getUsers();
  const username = normalizeUsername(formData.get("username"));
  const displayName = sanitizeText(formData.get("displayName")) || username;
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (!isValidUsername(username)) throw new Error("用户名只能包含字母、数字、下划线、短横线，长度 3-32 位。");
  if (users.some((user) => user.username === username)) throw new Error("用户名已存在，请换一个。");
  if (!password) throw new Error("初始密码不能为空。");
  if (password !== confirmPassword) throw new Error("两次密码不一致。");

  users.push({
    id: createUserId(),
    username,
    displayName,
    role: "teacher",
    passwordHash: await hashPassword(password),
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: "",
  });
  saveUsers(users);
  createTeacherForm.reset();
  renderUserManagementPanel();
}

async function loginUser(formData) {
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") || "");
  const users = getUsers();
  const user = users.find((item) => item.username === username);
  if (!user || !(await verifyPassword(password, user))) throw new Error("用户名或密码不正确。");
  if (user.isActive === false) throw new Error("该账号已停用，请联系管理员。");
  user.lastLoginAt = new Date().toISOString();
  saveUsers(users);
  setCurrentUser(user);
}

function updateUserStatus(userId, isActive) {
  const current = getCurrentUser();
  const users = getUsers();
  const user = users.find((item) => item.id === userId);
  if (!user) return;
  if (current?.id === user.id && isActive === false) {
    userManagementMessage.textContent = "管理员不能停用自己当前登录的账号。";
    userManagementMessage.classList.add("error-note");
    return;
  }
  user.isActive = isActive;
  saveUsers(users);
  renderUserManagementPanel();
}

function normalizeTeacherAlias(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "未设置";
}

function getCurrentTeacher() {
  const user = getCurrentUser();
  if (user) return normalizeTeacherAlias(user.displayName);
  return normalizeTeacherAlias(localStorage.getItem(currentTeacherKey));
}

function saveCurrentTeacher(value) {
  if (getCurrentUser()) {
    renderCurrentTeacher();
    return;
  }
  const alias = normalizeTeacherAlias(value);
  if (alias === "未设置") localStorage.removeItem(currentTeacherKey);
  else localStorage.setItem(currentTeacherKey, alias);
  renderCurrentTeacher();
  applyOrganizationProfileToUI();
  renderUsageStats();
}

function renderCurrentTeacher() {
  const user = getCurrentUser();
  const alias = getCurrentTeacher();
  currentTeacherLabel.textContent = alias;
  teacherAliasInput.value = alias === "未设置" ? "" : alias;
  teacherAliasInput.disabled = Boolean(user);
  saveTeacherButton.disabled = Boolean(user);
  document.querySelector(".teacher-identity-hint").textContent = user
    ? "登录状态下，教师身份由学校内部账号的显示名称自动确定。"
    : "教师身份仅用于本浏览器中的使用统计，建议填写教师代号或昵称。请勿填写身份证号、手机号等敏感信息。";
}

function sanitizeText(value) {
  return String(value || "").trim().slice(0, 120);
}

function passwordErrorMessage(code) {
  const messages = {
    current_password_required: "当前密码不能为空。",
    new_password_required: "新密码不能为空。",
    password_too_short: "新密码至少需要 8 位。",
    password_confirm_not_match: "两次输入的新密码不一致。",
    password_same_as_current: "新密码不能和当前密码完全相同。",
    current_password_incorrect: "当前密码不正确，请重新输入。",
    not_admin: "当前账号没有管理员权限。",
    cannot_reset_self: "不能在账号管理中重置自己的密码，请使用“修改密码”。",
    target_user_not_found: "未找到要重置密码的教师账号。",
    different_organization: "不能操作其他机构的账号。",
    reset_password_failed: "密码重置失败，请稍后再试。",
    invalid_login_state: "登录状态已失效，请重新登录后再操作。",
  };
  return messages[code] || code || "网络或服务器错误，请稍后再试。";
}

function getPasswordValidationError(currentPassword, newPassword, confirmPassword, requireCurrent = true) {
  if (requireCurrent && !currentPassword) return "current_password_required";
  if (!newPassword) return "new_password_required";
  if (newPassword.length < 8) return "password_too_short";
  if (newPassword !== confirmPassword) return "password_confirm_not_match";
  if (requireCurrent && newPassword === currentPassword) return "password_same_as_current";
  return "";
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
  if (!canEditOrganizationProfile()) return;
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
  if (!canEditOrganizationProfile()) return;
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
  const editable = canEditOrganizationProfile();
  const organizationName = profile.organizationName || "未设置机构信息";
  currentOrganizationLabel.textContent = organizationName;
  overviewOrganizationName.textContent = organizationName;
  overviewOrganizationType.textContent = profile.organizationType || "未设置";
  overviewUsageScenario.textContent = profile.usageScenario || "未设置";
  overviewTeacherAlias.textContent = getCurrentTeacher();
  overviewTotalCount.textContent = getUsageRecords().length;
  renderOrganizationProfile();
  for (const element of organizationForm.elements) element.disabled = !editable;
  saveOrganizationButton.classList.toggle("is-hidden", !editable);
  clearOrganizationButton.classList.toggle("is-hidden", !editable);
  renderReportMeta();
  renderAccountSecurityPanel();
}

function renderReportMeta(meta = lastReportMeta) {
  const organization = getOrganizationProfile();
  const contentType = meta?.contentType || getCurrentConfig().title || "未生成";
  const createdAt = meta?.createdAt ? formatRecordTime(meta.createdAt) : "未生成";
  const rows = [];

  if (organization.organizationName) {
    rows.push(["机构名称", organization.organizationName]);
  }
  if (organization.organizationType) {
    rows.push(["机构类型", organization.organizationType]);
  }
  if (organization.usageScenario) {
    rows.push(["使用场景", organization.usageScenario]);
  }
  if (organization.reportSignature) {
    rows.push(["报告署名", organization.reportSignature]);
  }
  rows.push(["报告用途", "绘画表达观察与学校心理辅导参考"]);
  rows.push(["生成类型", contentType]);
  rows.push(["当前教师", getCurrentTeacher()]);
  rows.push(["生成时间", createdAt]);

  reportMeta.innerHTML = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

function renderCurrentUserInfo() {
  const user = getCurrentUser();
  currentUserBadge.textContent = `当前登录：${user ? user.displayName : "未登录"}`;
  currentRoleBadge.textContent = `角色：${user ? getRoleLabel(user.role) : "未登录"}`;
  logoutButton.textContent = user ? "退出账号" : "退出登录";
  renderAccountSecurityPanel();
  renderCurrentTeacher();
  applyOrganizationProfileToUI();
  validateForm();
}

function renderAccountSecurityPanel() {
  const user = getCurrentUser();
  const organization = getOrganizationProfile();
  if (!accountUsernameText) return;
  accountUsernameText.textContent = user?.username || "未登录";
  accountDisplayNameText.textContent = user?.displayName || "未登录";
  accountRoleText.textContent = user ? getRoleLabel(user.role) : "未登录";
  accountOrganizationText.textContent = organization.organizationName || "未设置";
  accountStatusText.textContent = user ? (user.isActive === false ? "停用" : "启用") : "未登录";
}

function renderLoginPanel() {
  const hasUsers = getUsers().length > 0;
  const user = getCurrentUser();
  accountPanel.classList.toggle("is-hidden", Boolean(user));
  initialAdminForm.classList.toggle("is-hidden", hasUsers || Boolean(user));
  userLoginForm.classList.toggle("is-hidden", !hasUsers || Boolean(user));
  accountPanelTitle.textContent = user ? `已登录：${user.displayName}` : hasUsers ? "请先登录后使用心灵画卷" : "首次使用，请创建本机管理员账号";
  accountMessage.textContent = user
    ? "账号已登录。"
    : "当前为本机演示账号系统，适合内部试用和功能演示。正式上线前应升级为云端认证、数据库权限和更严格的数据保护机制。";
}

function renderPermissionUI() {
  const user = getCurrentUser();
  const admin = isAdmin(user);
  userManagementPanel.classList.toggle("is-hidden", !admin);
  if (!admin && resetPasswordPanel) closeResetPasswordForm();
  teacherFilterSelect.disabled = !admin;
  clearStatsButton.classList.toggle("is-hidden", !admin);
  clearCurrentTeacherStatsButton.classList.toggle("is-hidden", !admin);
  renderUserManagementPanel();
}

function isModelSettingsUnlocked() {
  return isAdmin();
}

function setModelSettingsMessage(message, isError = false) {
  modelSettingsMessage.textContent = message;
  modelSettingsMessage.classList.toggle("error-note", Boolean(isError));
}

function modelSettingsFromForm() {
  const formData = new FormData(modelSettingsForm);
  return {
    pipelineMode: formData.get("pipelineMode"),
    singleProvider: formData.get("singleProvider"),
    singleModel: formData.get("singleModel"),
    visionProvider: formData.get("visionProvider"),
    visionModel: formData.get("visionModel"),
    textProvider: formData.get("textProvider"),
    textModel: formData.get("textModel"),
  };
}

function applyModelSettingsToForm(settings = {}) {
  modelSettingsForm.pipelineMode.value = settings.pipelineMode || "single";
  modelSettingsForm.singleProvider.value = settings.singleProvider || "openai";
  modelSettingsForm.singleModel.value = settings.singleModel || "gpt-4o-mini";
  modelSettingsForm.visionProvider.value = settings.visionProvider || "openai";
  modelSettingsForm.visionModel.value = settings.visionModel || "gpt-4o-mini";
  modelSettingsForm.textProvider.value = settings.textProvider || "openai";
  modelSettingsForm.textModel.value = settings.textModel || "gpt-4o-mini";
}

async function loadModelSettings() {
  const response = await fetch("/api/model-settings");
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "读取设置失败。");
  applyModelSettingsToForm(data.settings);
  const sourceLabel = data.settings?.source ? `当前来源：${data.settings.source}` : "已读取当前设置。";
  setModelSettingsMessage(sourceLabel);
}

function renderModelSettingsPanel() {
  if (!modelSettingsPanel) return;
  const unlocked = isModelSettingsUnlocked();
  modelSettingsLock.classList.toggle("is-hidden", unlocked);
  modelSettingsUnlockedIntro.classList.toggle("is-hidden", !unlocked);
  modelSettingsForm.classList.toggle("is-hidden", !unlocked);
  modelSettingsActions.classList.toggle("is-hidden", !unlocked);
  if (unlocked) {
    loadModelSettings().catch((error) => setModelSettingsMessage(error.message || "读取设置失败。", true));
  } else {
    setModelSettingsMessage("管理员设置由设置码临时保护。");
  }
}

async function loadModelProviderStatus() {
  if (!modelProviderStatusList || !isAdmin()) return;
  const data = await cnApi("/api/cn-admin-model-provider-status");
  modelProviderStatusList.innerHTML = "";
  const labels = { qwen: "Qwen API", deepseek: "DeepSeek API", openai: "OpenAI API", doubao: "豆包 API" };
  for (const key of ["qwen", "deepseek", "openai", "doubao"]) {
    const row = document.createElement("div");
    row.className = "type-row";
    const label = document.createElement("span");
    const value = document.createElement("strong");
    label.textContent = labels[key] || key;
    value.textContent = data.providers?.[key]?.configured ? "已配置" : "未配置";
    row.append(label, value);
    modelProviderStatusList.appendChild(row);
  }
}

loadModelSettings = async function loadCnSqliteModelSettings() {
  const data = await cnApi("/api/cn-model-settings");
  applyModelSettingsToForm(data.settings);
  if (modelSettingsMeta) {
    const updatedAt = data.settings?.updatedAt ? formatRecordTime(data.settings.updatedAt) : "未记录";
    const updatedBy = data.settings?.updatedByDisplayName || data.settings?.updatedBy || "系统默认";
    modelSettingsMeta.textContent = `当前更新时间：${updatedAt}；当前修改管理员：${updatedBy}`;
  }
  setModelSettingsMessage("已读取 SQLite 中的模型设置。");
  await loadModelProviderStatus();
};

renderModelSettingsPanel = function renderCnSqliteModelSettingsPanel() {
  if (!modelSettingsPanel) return;
  const unlocked = isModelSettingsUnlocked();
  modelSettingsLock?.classList.add("is-hidden");
  modelSettingsUnlockedIntro.classList.toggle("is-hidden", !unlocked);
  modelSettingsForm.classList.toggle("is-hidden", !unlocked);
  modelSettingsActions.classList.toggle("is-hidden", !unlocked);
  if (unlocked) {
    loadModelSettings().catch((error) => setModelSettingsMessage(error.message || "读取模型设置失败。", true));
  } else {
    setModelSettingsMessage("模型设置仅管理员可见。");
  }
};

function describeModelTestResult(result = {}) {
  if (result.overallStatus) {
    return `组合测试：${result.overallStatus}；视觉：${result.visionStatus}；文本：${result.textStatus}；耗时 ${result.durationMs || 0}ms`;
  }
  if (result.success) return `${result.provider || "-"} / ${result.model || "-"}：连接测试通过；耗时 ${result.durationMs || 0}ms`;
  return `${result.provider || "-"} / ${result.model || "-"}：连接测试失败：${result.error || "unknown_error"}；耗时 ${result.durationMs || 0}ms`;
}

async function runModelTest(path) {
  const data = await cnApi(path, { method: "POST" });
  const result = data.result || {};
  setModelSettingsMessage(describeModelTestResult(result), Boolean(result.success === false || result.overallStatus === "failed"));
}

function renderSystemStatusRows(status = {}) {
  if (!systemStatusGrid) return;
  systemStatusGrid.innerHTML = "";
  const rows = [
    ["程序版本", status.version || "-"],
    ["运行模式", status.appMode || "-"],
    ["监听端口", status.port || "-"],
    ["数据库状态", status.database || "-"],
    ["最近备份", status.latestBackupAt ? formatRecordTime(status.latestBackupAt) : "暂无"],
    ["局域网地址", Array.isArray(status.lanAddresses) && status.lanAddresses.length ? status.lanAddresses.map((ip) => `http://${ip}:${status.port}`).join(" / ") : "未检测到"],
  ];
  for (const [labelText, valueText] of rows) {
    const item = document.createElement("div");
    const label = document.createElement("span");
    const value = document.createElement("strong");
    label.textContent = labelText;
    value.textContent = String(valueText);
    item.append(label, value);
    systemStatusGrid.appendChild(item);
  }
}

async function loadSystemStatus() {
  if (!isAdmin()) return;
  const data = await cnApi("/api/cn-admin-system-status");
  renderSystemStatusRows(data.status || {});
  if (systemStatusMessage) systemStatusMessage.textContent = "状态已刷新。";
}

function shortHash(value) {
  const text = String(value || "");
  return text ? `${text.slice(0, 10)}...` : "-";
}

function backupTypeLabel(type) {
  const labels = {
    manual: "manual",
    "pre-restore": "pre-restore",
    imported: "imported",
  };
  return labels[type] || type || "-";
}

function backupSizeLabel(size) {
  const value = Number(size || 0);
  if (!value) return "-";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function setSelectedRestoreBackup(backup) {
  selectedRestoreBackup = backup || null;
  if (restoreBackupIdInput) restoreBackupIdInput.value = selectedRestoreBackup?.id || "";
  if (restoreSelectedBackupText) {
    restoreSelectedBackupText.value = selectedRestoreBackup
      ? `${selectedRestoreBackup.fileName || selectedRestoreBackup.id} (${selectedRestoreBackup.createdAt ? formatRecordTime(selectedRestoreBackup.createdAt) : "-"})`
      : "请先从上方列表选择备份";
  }
  if (restoreDatabaseButton) restoreDatabaseButton.disabled = !selectedRestoreBackup;
}

async function loadBackups() {
  if (!isAdmin() || !backupListBody) return;
  const data = await cnApi("/api/cn-admin-backups");
  const backups = Array.isArray(data.backups) ? data.backups : [];
  backupListBody.innerHTML = "";
  setSelectedRestoreBackup(null);
  if (!backups.length) {
    backupListBody.innerHTML = '<tr><td colspan="8">暂无备份</td></tr>';
    return;
  }
  for (const backup of backups) {
    const row = document.createElement("tr");
    const values = [
      backup.createdAt ? formatRecordTime(backup.createdAt) : "-",
      backupTypeLabel(backup.backupType),
      backup.fileName || backup.id || "-",
      backupSizeLabel(backup.databaseSize),
      `${backup.sha256Status || "-"} / ${shortHash(backup.sha256)}`,
      backup.applicationVersion || "-",
      backup.schemaVersion ?? "-",
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
    const actions = document.createElement("td");
    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "ghost-button table-button";
    downloadButton.textContent = "下载";
    downloadButton.addEventListener("click", () => downloadBackup(backup.id));
    const restoreButton = document.createElement("button");
    restoreButton.type = "button";
    restoreButton.className = "ghost-button table-button";
    restoreButton.textContent = "恢复此备份";
    restoreButton.addEventListener("click", () => {
      setSelectedRestoreBackup(backup);
      if (backupMessage) backupMessage.textContent = "已选择备份，请输入管理员当前密码和确认文本后恢复。";
    });
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost-button table-button danger-button";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", () => deleteBackup(backup.id));
    actions.append(downloadButton, restoreButton, deleteButton);
    row.appendChild(actions);
    backupListBody.appendChild(row);
  }
}

async function createBackup() {
  const data = await cnApi("/api/cn-admin-backups", { method: "POST" });
  if (backupMessage) backupMessage.textContent = `备份已创建：${data.backup?.id || ""}`;
  await loadBackups();
  await loadSystemStatus().catch(() => {});
}

async function downloadBackup(id) {
  const response = await fetch(`/api/cn-admin-backups/${encodeURIComponent(id)}/download`, {
    headers: { Authorization: `Bearer ${cnToken()}` },
  });
  if (!response.ok) {
    if (backupMessage) backupMessage.textContent = "备份下载失败。";
    return;
  }
  const blob = await response.blob();
  downloadBlobFile(blob, id, "application/octet-stream");
}

async function deleteBackup(id) {
  if (!confirm(`确定删除备份 ${id} 吗？`)) return;
  await cnApi(`/api/cn-admin-backups/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (backupMessage) backupMessage.textContent = "备份已删除。";
  await loadBackups();
}

async function importBackup() {
  const file = importBackupFileInput?.files?.[0];
  if (!file) {
    if (backupMessage) backupMessage.textContent = "请先选择要导入的备份文件。";
    return;
  }
  const formData = new FormData();
  formData.append("backupFile", file);
  const response = await fetch("/api/cn-admin-backups/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${cnToken()}` },
    body: formData,
  });
  const data = await readCnResponse(response, "backup_import_failed");
  if (backupMessage) backupMessage.textContent = `导入成功：${data.backup?.id || ""}`;
  if (importBackupFileInput) importBackupFileInput.value = "";
  await loadBackups();
}

async function restoreDatabase() {
  const formData = new FormData(restoreDatabaseForm);
  if (!selectedRestoreBackup?.id) {
    if (backupMessage) backupMessage.textContent = "请先从备份列表选择要恢复的备份。";
    return;
  }
  const selectedLabel = `${selectedRestoreBackup.fileName || selectedRestoreBackup.id} / ${selectedRestoreBackup.createdAt ? formatRecordTime(selectedRestoreBackup.createdAt) : "-"}`;
  if (!confirm(`恢复会覆盖当前机构、账号和统计数据。\n\n选中备份：${selectedLabel}\n\n确定继续吗？`)) return;
  const data = await cnApi("/api/cn-admin-restore-database", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      backupId: selectedRestoreBackup.id,
      currentPassword: String(formData.get("currentPassword") || ""),
      confirmText: String(formData.get("confirmText") || ""),
    }),
  });
  if (backupMessage) backupMessage.textContent = `恢复完成，请重新登录。恢复前备份：${data.result?.beforeRestoreBackupId || ""}`;
  clearCnSession();
  renderLoginPanel();
}

function renderUserManagementPanel() {
  if (!canManageUsers()) return;
  const current = getCurrentUser();
  const users = getUsers();
  userManagementMessage.textContent = "";
  userManagementMessage.classList.remove("error-note");
  userListBody.innerHTML = "";
  if (!users.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "暂无用户";
    row.appendChild(cell);
    userListBody.appendChild(row);
    return;
  }

  for (const user of users) {
    const row = document.createElement("tr");
    const values = [user.username, user.displayName, getRoleLabel(user.role), user.isActive === false ? "停用" : "启用", user.createdAt ? formatRecordTime(user.createdAt) : "未知"];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "ghost-button table-button";
    button.type = "button";
    button.textContent = user.isActive === false ? "启用" : "停用";
    button.disabled = current?.id === user.id;
    button.addEventListener("click", () => updateUserStatus(user.id, user.isActive === false));
    actionCell.appendChild(button);
    row.appendChild(actionCell);
    userListBody.appendChild(row);
  }
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

function showPublicHome() {
  publicHomeView.classList.remove("is-hidden");
  loginScreen.classList.add("is-hidden");
  appShell.classList.add("is-hidden");
}

function showInternalEntry() {
  publicHomeView.classList.add("is-hidden");
  if (cnAuthMode) {
    showInternalApp();
    return;
  }
  if (sessionStorage.getItem(accessStateKey) === "true" && sessionStorage.getItem(accessCodeKey)) {
    showInternalApp();
  } else {
    loginScreen.classList.remove("is-hidden");
    appShell.classList.add("is-hidden");
  }
}

function showInternalApp() {
  publicHomeView.classList.add("is-hidden");
  loginScreen.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  renderCurrentUserInfo();
  renderLoginPanel();
  showAnalysisView();
}

function showApp() {
  showInternalApp();
}

function showLogin() {
  publicHomeView.classList.add("is-hidden");
  appShell.classList.add("is-hidden");
  loginScreen.classList.remove("is-hidden");
}

function restoreAccess() {
  showPublicHome();
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

logoutButton.addEventListener("click", async () => {
  if (getCurrentUser()) {
    await logoutUser();
    setStatus("请先登录后生成报告。", true);
    return;
  }
  if (cnAuthMode) {
    showPublicHome();
    return;
  }
  sessionStorage.removeItem(accessStateKey);
  sessionStorage.removeItem(accessCodeKey);
  sessionStorage.removeItem(adminSettingsAccessKey);
  loginForm.reset();
  resetWorkspace();
  showLogin();
});

function showAnalysisView() {
  analysisView.classList.remove("is-hidden");
  dashboardView.classList.add("is-hidden");
}

function showDashboardView() {
  if (!requireLogin("请先登录后进入教师工作台。")) return;
  analysisView.classList.add("is-hidden");
  dashboardView.classList.remove("is-hidden");
  renderPermissionUI();
  renderUsageStats();
  renderModelSettingsPanel();
}

analysisViewButton.addEventListener("click", showAnalysisView);
backToAnalysisButton.addEventListener("click", showAnalysisView);
dashboardViewButton.addEventListener("click", showDashboardView);
internalEntryButtons.forEach((button) => button.addEventListener("click", showInternalEntry));
backPublicButton.addEventListener("click", showPublicHome);
initialAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createInitialAdmin(new FormData(initialAdminForm));
    initialAdminForm.reset();
    showInitialAdminForm = false;
    renderLoginPanel();
    accountMessage.textContent = "管理员已创建并登录。";
    accountMessage.classList.remove("error-note");
  } catch (error) {
    accountMessage.textContent = error.message || "创建管理员失败。";
    accountMessage.classList.add("error-note");
  }
});
toggleInitialAdminButton.addEventListener("click", () => {
  showInitialAdminForm = !showInitialAdminForm;
  renderLoginPanel();
});
userLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await loginUser(new FormData(userLoginForm));
    userLoginForm.reset();
    accountMessage.textContent = "登录成功。";
    accountMessage.classList.remove("error-note");
  } catch (error) {
    accountMessage.textContent = error.message || "登录失败。";
    accountMessage.classList.add("error-note");
  }
});
createTeacherButton.addEventListener("click", async () => {
  try {
    await createTeacherUser(new FormData(createTeacherForm));
    userManagementMessage.textContent = "教师账号已创建。请将用户名和密码安全地交给教师。教师可登录后在工作台自行修改密码。";
    userManagementMessage.classList.remove("error-note");
  } catch (error) {
    userManagementMessage.textContent = error.message || "创建教师账号失败。";
    userManagementMessage.classList.add("error-note");
  }
});
refreshUserListButton?.addEventListener("click", () => renderUserManagementPanel());
requiredPasswordChangeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await changeCurrentUserPassword(new FormData(requiredPasswordChangeForm));
    requiredPasswordChangeForm.reset();
  } catch (error) {
    requiredPasswordChangeMessage.textContent = cnAuthErrorMessage(error.message);
    requiredPasswordChangeMessage.classList.add("error-note");
  }
});
changePasswordButton.addEventListener("click", async () => {
  try {
    await changeCurrentUserPassword(new FormData(changePasswordForm));
    changePasswordForm.reset();
    changePasswordMessage.textContent = "密码修改成功，请使用新密码登录。";
    changePasswordMessage.classList.remove("error-note");
  } catch (error) {
    changePasswordMessage.textContent = passwordErrorMessage(error.message);
    changePasswordMessage.classList.add("error-note");
  }
});
submitResetPasswordButton.addEventListener("click", async () => {
  try {
    const changed = await resetTeacherPassword();
    if (changed === false) return;
    resetPasswordForm.reset();
    resetPasswordMessage.textContent = "教师密码已重置，请将新密码通过安全方式告知该教师，并提醒其登录后及时修改。";
    resetPasswordMessage.classList.remove("error-note");
  } catch (error) {
    resetPasswordMessage.textContent = passwordErrorMessage(error.message);
    resetPasswordMessage.classList.add("error-note");
  }
});
cancelResetPasswordButton.addEventListener("click", closeResetPasswordForm);
saveTeacherButton.addEventListener("click", () => saveCurrentTeacher(teacherAliasInput.value));
teacherAliasInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveCurrentTeacher(teacherAliasInput.value);
});
saveOrganizationButton.addEventListener("click", () => saveOrganizationProfile());
clearOrganizationButton.addEventListener("click", () => {
  if (confirm("确定要清空本浏览器中的机构信息吗？这不会影响教师身份和使用统计记录。")) {
    clearOrganizationProfile();
  }
});
verifyModelSettingsButton.addEventListener("click", async () => {
  const adminSettingsCode = String(new FormData(modelSettingsCodeForm).get("adminSettingsCode") || "").trim();
  if (!adminSettingsCode) {
    setModelSettingsMessage("请输入管理员设置码。", true);
    return;
  }
  try {
    const response = await fetch("/api/verify-admin-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSettingsCode }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "管理员设置码不正确。");
    sessionStorage.setItem(adminSettingsAccessKey, "true");
    setModelSettingsMessage("已进入管理员设置。");
    renderModelSettingsPanel();
  } catch (error) {
    setModelSettingsMessage(error.message || "管理员设置码验证失败。", true);
  }
});
verifyModelSettingsButton?.addEventListener("click", (event) => {
  if (!cnAuthMode) return;
  event.stopImmediatePropagation();
  setModelSettingsMessage("大陆版账号模式下，已登录管理员可直接管理模型设置。");
  renderModelSettingsPanel();
}, true);
reloadModelSettingsButton.addEventListener("click", () => {
  loadModelSettings().catch((error) => setModelSettingsMessage(error.message || "读取设置失败。", true));
});
saveModelSettingsButton.addEventListener("click", async () => {
  const adminSettingsCode = String(new FormData(modelSettingsCodeForm).get("adminSettingsCode") || "").trim();
  if (!adminSettingsCode) {
    sessionStorage.removeItem(adminSettingsAccessKey);
    renderModelSettingsPanel();
    setModelSettingsMessage("请重新输入管理员设置码后保存。", true);
    return;
  }
  try {
    const response = await fetch("/api/model-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminSettingsCode,
        settings: modelSettingsFromForm(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "保存设置失败。");
    applyModelSettingsToForm(data.settings);
    setModelSettingsMessage("设置已保存。当前不会保存任何 API Key。");
  } catch (error) {
    setModelSettingsMessage(error.message || "保存设置失败。", true);
  }
});
reloadModelSettingsButton.addEventListener("click", (event) => {
  if (!cnAuthMode) return;
  event.stopImmediatePropagation();
  loadModelSettings().catch((error) => setModelSettingsMessage(error.message || "读取模型设置失败。", true));
}, true);
saveModelSettingsButton.addEventListener("click", async (event) => {
  if (!cnAuthMode) return;
  event.stopImmediatePropagation();
  try {
    const data = await cnApi("/api/cn-admin-model-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: modelSettingsFromForm() }),
    });
    applyModelSettingsToForm(data.settings);
    if (modelSettingsMeta) {
      const updatedAt = data.settings?.updatedAt ? formatRecordTime(data.settings.updatedAt) : "未记录";
      const updatedBy = data.settings?.updatedByDisplayName || data.settings?.updatedBy || "系统默认";
      modelSettingsMeta.textContent = `当前更新时间：${updatedAt}；当前修改管理员：${updatedBy}`;
    }
    setModelSettingsMessage("模型设置已保存到 SQLite。此处不保存任何 API Key。");
    await loadModelProviderStatus();
  } catch (error) {
    setModelSettingsMessage(error.message || "保存模型设置失败。", true);
  }
}, true);
testVisionModelButton?.addEventListener("click", () => runModelTest("/api/cn-admin-test-vision-model"));
testTextModelButton?.addEventListener("click", () => runModelTest("/api/cn-admin-test-text-model"));
testModelPipelineButton?.addEventListener("click", () => runModelTest("/api/cn-admin-test-model-pipeline"));
refreshSystemStatusButton?.addEventListener("click", () => loadSystemStatus().catch((error) => { if (systemStatusMessage) systemStatusMessage.textContent = error.message || "状态读取失败。"; }));
createBackupButton?.addEventListener("click", () => createBackup().catch((error) => { if (backupMessage) backupMessage.textContent = error.message || "备份失败。"; }));
refreshBackupsButton?.addEventListener("click", () => loadBackups().catch((error) => { if (backupMessage) backupMessage.textContent = error.message || "备份列表读取失败。"; }));
restoreDatabaseButton?.addEventListener("click", () => restoreDatabase().catch((error) => { if (backupMessage) backupMessage.textContent = error.message || "恢复失败。"; }));
importBackupButton?.addEventListener("click", () => importBackup().catch((error) => { if (backupMessage) backupMessage.textContent = error.message || "导入失败。"; }));

function setStatus(message, isError = false) {
  formHint.textContent = message;
  formHint.classList.toggle("error-note", isError);
}

function validateForm() {
  // 按钮只根据资料是否完整启用；是否登录在点击时提示，避免用户看不到原因。
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
        userId: String(record.userId || ""),
        username: String(record.username || ""),
        userRole: String(record.userRole || ""),
      }));
  } catch {
    return [];
  }
}

function saveUsageRecord(contentType) {
  const safeType = normalizeContentType(contentType);
  const user = getCurrentUser();
  const records = getUsageRecords();
  records.push({
    id: createUsageId(),
    createdAt: new Date().toISOString(),
    contentType: safeType,
    isRiskRelated: safeType === "风险提示与转介建议",
    teacherAlias: getCurrentTeacher(),
    userId: user?.id || "",
    username: user?.username || "",
    userRole: user?.role || "",
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

function filterRecordsByCurrentUser(records) {
  const user = getCurrentUser();
  if (!user) return [];
  if (isAdmin(user)) return records;
  return records.filter((record) => record.userId === user.id || (!record.userId && normalizeTeacherAlias(record.teacherAlias) === normalizeTeacherAlias(user.displayName)));
}

function getUsageStats(teacherAlias = "全部教师") {
  const visibleRecords = filterRecordsByCurrentUser(getUsageRecords());
  const records = isAdmin() ? filterUsageRecordsByTeacher(visibleRecords, teacherAlias) : visibleRecords;
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
  const teacherOptions = isAdmin() ? getTeacherOptions(filterRecordsByCurrentUser(getUsageRecords())) : [getCurrentTeacher()];
  teacherFilterSelect.innerHTML = "";
  for (const optionValue of teacherOptions) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    teacherFilterSelect.appendChild(option);
  }
  teacherFilterSelect.value = isAdmin() && teacherOptions.includes(previousFilter) ? previousFilter : teacherOptions[0];

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
  const visibleRecords = filterRecordsByCurrentUser(getUsageRecords());
  const records = isAdmin() ? filterUsageRecordsByTeacher(visibleRecords, teacherFilter) : visibleRecords;
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

function exportUsageRecordsCsv() {
  const records = filterRecordsByCurrentUser(getUsageRecords());
  const lines = [["生成时间", "教师", "报告类型", "风险相关"].map(csvCell).join(",")];
  for (const record of records) {
    lines.push([record.createdAt, record.teacherAlias, record.contentType, record.isRiskRelated ? "是" : "否"].map(csvCell).join(","));
  }
  downloadBlobFile(`\uFEFF${lines.join("\r\n")}`, `xinling-usage-statistics-${exportDateStamp().replace(/-/g, "")}.csv`, "text/csv;charset=utf-8");
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
  return escapeHtml(value).replace(/\*\*(.*?")\*\*/g, "<strong>$1</strong>");
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

function getCurrentReportMeta() {
  return lastReportMeta
    ? {
        contentType: lastReportMeta.contentType,
        createdAt: lastReportMeta.createdAt,
        createdAtText: formatRecordTime(lastReportMeta.createdAt),
      }
    : null;
}

function markdownToPlainText(markdown) {
  return String(markdown || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildReportExportData() {
  if (!lastReportText || !lastReportMeta) return null;
  const organization = getOrganizationProfile();
  const meta = getCurrentReportMeta();
  // 导出只读取当前页面中的报告，不写入 localStorage，避免保存敏感报告正文。
  return {
    title: "心灵画卷 · 绘画心理观察辅助报告",
    organizationName: organization.organizationName || "未设置机构",
    organizationType: organization.organizationType,
    usageScenario: organization.usageScenario,
    reportSignature: organization.reportSignature,
    teacherAlias: getCurrentTeacher(),
    contentType: meta.contentType,
    createdAtText: meta.createdAtText,
    purpose: "绘画表达观察与学校心理辅导参考",
    disclaimer: "本内容仅供绘画表达观察、访谈准备和学校心理辅导参考，不构成心理诊断。如发现自伤、自杀、严重暴力、长期失眠、明显拒学等风险线索，应及时启动人工评估、联系监护人并寻求专业资源支持。",
    bodyMarkdown: lastReportText,
    bodyText: markdownToPlainText(lastReportText),
    signature: organization.reportSignature || "心灵画卷",
  };
}

function buildPlainTextReport(data) {
  const lines = [
    data.title,
    "",
    "基本信息：",
  ];
  if (data.organizationName) lines.push(`机构名称：${data.organizationName}`);
  if (data.organizationType) lines.push(`机构类型：${data.organizationType}`);
  if (data.usageScenario) lines.push(`使用场景：${data.usageScenario}`);
  if (data.reportSignature) lines.push(`报告署名：${data.reportSignature}`);
  lines.push(`当前教师：${data.teacherAlias}`);
  lines.push(`生成类型：${data.contentType}`);
  lines.push(`生成时间：${data.createdAtText}`);
  lines.push(`报告用途：${data.purpose}`);
  lines.push("");
  lines.push("免责声明：");
  lines.push(data.disclaimer);
  lines.push("");
  lines.push("报告正文：");
  lines.push(data.bodyText);
  lines.push("");
  lines.push(`—— ${data.signature}`);
  return lines.join("\n");
}

function buildWordHtmlReport(data) {
  // 使用 Word 可打开的 HTML .doc 方案，避免引入额外复杂依赖。
  const infoRows = [];
  if (data.organizationName) infoRows.push(["机构名称", data.organizationName]);
  if (data.organizationType) infoRows.push(["机构类型", data.organizationType]);
  if (data.usageScenario) infoRows.push(["使用场景", data.usageScenario]);
  if (data.reportSignature) infoRows.push(["报告署名", data.reportSignature]);
  infoRows.push(["当前教师", data.teacherAlias]);
  infoRows.push(["生成类型", data.contentType]);
  infoRows.push(["生成时间", data.createdAtText]);
  infoRows.push(["报告用途", data.purpose]);

  const infoHtml = infoRows
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #333; line-height: 1.75; }
    h1 { color: #5f4d34; font-size: 24px; }
    h2 { color: #6a5439; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { width: 150px; background: #f5efe3; }
    .disclaimer { margin: 18px 0; padding: 12px; background: #fbf7ef; border: 1px solid #e5d8c7; }
    .signature { margin-top: 28px; text-align: right; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <h2>基本信息</h2>
  <table>${infoHtml}</table>
  <h2>免责声明</h2>
  <div class="disclaimer">${escapeHtml(data.disclaimer)}</div>
  <h2>报告正文</h2>
  <div>${markdownToHtml(data.bodyMarkdown)}</div>
  <p class="signature">—— ${escapeHtml(data.signature)}</p>
</body>
</html>`;
}

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function downloadBlobFile(content, fileName, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadTextFile() {
  const data = buildReportExportData();
  if (!data) {
    alert("请先生成报告，再导出。");
    return;
  }
  const fileName = `${sanitizeFileName(`心灵画卷_${data.contentType}_${exportDateStamp()}`)}.txt`;
  downloadBlobFile(buildPlainTextReport(data), fileName, "text/plain;charset=utf-8");
}

function downloadWordFile() {
  const data = buildReportExportData();
  if (!data) {
    alert("请先生成报告，再导出。");
    return;
  }
  const fileName = `${sanitizeFileName(`心灵画卷_${data.contentType}_${exportDateStamp()}`)}.doc`;
  downloadBlobFile(buildWordHtmlReport(data), fileName, "application/msword;charset=utf-8");
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
  if (!requireLogin("请先登录后生成报告。")) return;

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

  const accessCode = cnAuthMode ? "" : sessionStorage.getItem(accessCodeKey);
  if (!cnAuthMode && !accessCode) {
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
    const authToken = cloudAuthReady ? await getCloudAccessToken() : "";
    const headers = { "Content-Type": "application/json" };
    if (!cnAuthMode) headers["X-Access-Code"] = accessCode;
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(cnAuthMode ? {} : { accessCode }),
        image: selectedDataUrl,
        imageType: selectedFile.type,
        profile: teacherProfile,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "OpenAI API 调用失败，请稍后再试。");

    renderReport(data);
    await saveUsageRecord(teacherProfile.contentType);
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
exportTxtButton.addEventListener("click", downloadTextFile);
exportWordButton.addEventListener("click", downloadWordFile);

resetButton.addEventListener("click", () => {
  reportCard.classList.add("is-hidden");
  loadingCard.classList.add("is-hidden");
  validateForm();
  setStatus("可调整记录信息后重新生成。");
  document.querySelector("#uploadTitle").scrollIntoView({ behavior: "smooth", block: "start" });
});

refreshStatsButton.addEventListener("click", () => renderUsageStats());
teacherFilterSelect.addEventListener("change", () => renderUsageStats());
usageDateFrom?.addEventListener("change", () => renderUsageStats());
usageDateTo?.addEventListener("change", () => renderUsageStats());
usageContentTypeFilter?.addEventListener("change", () => renderUsageStats());
exportStatsButton.addEventListener("click", () => exportUsageRecords());
exportStatsCsvButton?.addEventListener("click", () => exportUsageRecordsCsv());
clearStatsButton.addEventListener("click", () => {
  if (!isAdmin()) return;
  if (confirm("确定要清空本浏览器中的所有使用统计吗？此操作不会删除学生资料或报告正文，因为系统本来就没有保存这些内容；但统计次数将无法恢复。")) {
    clearUsageRecords();
  }
});
clearCurrentTeacherStatsButton.addEventListener("click", () => {
  if (!isAdmin()) return;
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
  reportContent.replaceChildren();
  isSubmitting = false;
  analyzeButton.disabled = true;
  reportTitle.textContent = "房树人绘画心理观察辅助报告";
  renderReportMeta();
  updateGenerateLabels();
  setStatus("请先上传图画，并补充必填记录信息。");
}

let cloudSupabase = null;
let currentCloudSession = null;
let currentCloudProfile = null;
let currentCloudOrganization = null;
let cloudProfiles = [];
let cloudUsageRecords = [];
let cloudAuthReady = false;
let resetPasswordTargetUser = null;

function usernameToInternalEmail(username) {
  return `${normalizeUsername(username)}@xinlinghuajuan.invalid`;
}

async function initSupabaseClient() {
  if (cloudSupabase) return cloudSupabase;
  if (!window.supabase?.createClient) throw new Error("Supabase 客户端未加载，请检查网络或稍后重试。");
  const response = await fetch("/api/supabase-config");
  const config = await response.json().catch(() => ({}));
  if (config.authProvider === "cn-dev") throw new Error("cn_dev_mode");
  if (!response.ok || !config.url || !config.anonKey) throw new Error("Supabase 环境变量尚未配置完整。");
  cloudSupabase = window.supabase.createClient(config.url, config.anonKey);
  return cloudSupabase;
}

async function getCloudAccessToken() {
  await initSupabaseClient();
  const { data } = await cloudSupabase.auth.getSession();
  currentCloudSession = data.session || null;
  if (!currentCloudSession?.access_token) throw new Error("请先登录后生成报告。");

  let { data: userData, error: userError } = await cloudSupabase.auth.getUser(currentCloudSession.access_token);
  if (userError || !userData?.user) {
    const refreshed = await cloudSupabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data?.session) {
      await cloudSupabase.auth.signOut();
      currentCloudSession = null;
      currentCloudProfile = null;
      renderCurrentUserInfo();
      renderLoginPanel();
      throw new Error("登录状态已失效，请重新登录后再操作。");
    }
    currentCloudSession = refreshed.data.session;
    const checked = await cloudSupabase.auth.getUser(currentCloudSession.access_token);
    userData = checked.data;
    userError = checked.error;
    if (userError || !userData?.user) {
      await cloudSupabase.auth.signOut();
      currentCloudSession = null;
      currentCloudProfile = null;
      renderCurrentUserInfo();
      renderLoginPanel();
      throw new Error("登录状态已失效，请重新登录后再操作。");
    }
  }

  if (!currentCloudProfile || currentCloudProfile.id !== userData.user.id) {
    await loadCurrentProfile();
  }
  return currentCloudSession.access_token;
}

function mapProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name || profile.username,
    role: profile.role,
    isActive: profile.is_active !== false,
    createdAt: profile.created_at || "",
    organizationId: profile.organization_id || "",
  };
}

async function loadCurrentProfile() {
  if (!currentCloudSession?.user?.id) {
    currentCloudProfile = null;
    return null;
  }
  const { data, error } = await cloudSupabase.from("profiles").select("*").eq("id", currentCloudSession.user.id).single();
  if (error || !data) {
    currentCloudProfile = null;
    throw new Error("账号资料不存在，请联系管理员。");
  }
  if (data.is_active === false) {
    await cloudSupabase.auth.signOut();
    currentCloudSession = null;
    currentCloudProfile = null;
    throw new Error("该账号已停用，请联系管理员。");
  }
  currentCloudProfile = mapProfile(data);
  localStorage.setItem(currentTeacherKey, currentCloudProfile.displayName);
  await loadOrganizationFromCloud();
  return currentCloudProfile;
}

async function loadCurrentSession() {
  await initSupabaseClient();
  const { data } = await cloudSupabase.auth.getSession();
  currentCloudSession = data.session || null;
  if (currentCloudSession && !currentCloudProfile) await loadCurrentProfile();
  return currentCloudSession;
}

getCurrentUser = function getCurrentCloudUser() {
  return currentCloudProfile;
};

isAdmin = function isCloudAdmin(user = getCurrentUser()) {
  return user?.role === "admin";
};

isTeacher = function isCloudTeacher(user = getCurrentUser()) {
  return user?.role === "teacher";
};

requireLogin = function requireCloudLogin(message = "请先登录后使用心灵画卷。") {
  if (!cloudAuthReady) {
    const hasAccess = sessionStorage.getItem(accessStateKey) === "true" && sessionStorage.getItem(accessCodeKey);
    if (hasAccess) return true;
    setStatus("访问状态已失效，请重新输入内部访问码。", true);
    showLogin();
    return false;
  }
  const user = getCurrentUser();
  if (user) return true;
  setStatus(message, true);
  renderLoginPanel();
  return false;
};

setCurrentUser = function setCurrentCloudUser(profile) {
  currentCloudProfile = profile;
  if (profile?.displayName) localStorage.setItem(currentTeacherKey, profile.displayName);
  renderCurrentUserInfo();
  renderLoginPanel();
  renderPermissionUI();
  renderUsageStats();
};

logoutUser = async function logoutCloudUser() {
  if (cloudSupabase) await cloudSupabase.auth.signOut();
  currentCloudSession = null;
  currentCloudProfile = null;
  currentCloudOrganization = null;
  cloudProfiles = [];
  cloudUsageRecords = [];
  showInitialAdminForm = false;
  renderCurrentUserInfo();
  renderLoginPanel();
  showAnalysisView();
  renderUsageStats();
};

createInitialAdmin = async function bootstrapCloudAdmin(formData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (password !== confirmPassword) throw new Error("两次密码不一致。");
  if (!sanitizeText(formData.get("organizationName"))) throw new Error("机构名称不能为空。");

  const response = await fetch("/api/bootstrap-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(formData.entries())),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "初始化云端管理员失败。");
  return data;
};

loginUser = async function loginCloudUser(formData) {
  await initSupabaseClient();
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") || "");
  if (!isValidUsername(username)) throw new Error("登录账号格式不正确。");
  await cloudSupabase.auth.signOut();
  const { data, error } = await cloudSupabase.auth.signInWithPassword({
    email: usernameToInternalEmail(username),
    password,
  });
  if (error || !data.session) throw new Error("账号或密码不正确。");
  currentCloudSession = data.session;
  await loadCurrentProfile();
  renderCurrentUserInfo();
  renderLoginPanel();
  renderPermissionUI();
  await renderUsageStats();
};

async function changeCurrentUserPassword(formData) {
  const user = getCurrentUser();
  if (!user) throw new Error("invalid_login_state");
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmNewPassword") || "");
  const validationError = getPasswordValidationError(currentPassword, newPassword, confirmPassword, true);
  if (validationError) throw new Error(validationError);

  await initSupabaseClient();
  const { data: loginData, error: loginError } = await cloudSupabase.auth.signInWithPassword({
    email: usernameToInternalEmail(user.username),
    password: currentPassword,
  });
  if (loginError || !loginData.session) throw new Error("current_password_incorrect");

  currentCloudSession = loginData.session;
  const { error: updateError } = await cloudSupabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(updateError.message || "reset_password_failed");
  await loadCurrentProfile();
}

createTeacherUser = async function createTeacherCloudUser(formData) {
  if (!canManageUsers()) throw new Error("只有管理员可以创建教师账号。");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (password !== confirmPassword) throw new Error("两次密码不一致。");
  const token = await getCloudAccessToken();
  const response = await fetch("/api/admin-create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(Object.fromEntries(formData.entries())),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "创建教师账号失败。");
  createTeacherForm.reset();
  await fetchProfilesForAdmin();
  renderUserManagementPanel();
};

updateUserStatus = async function updateTeacherCloudStatus(userId, isActive) {
  const token = await getCloudAccessToken();
  const response = await fetch("/api/admin-update-user-status", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId, isActive }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    userManagementMessage.textContent = data.error || "更新账号状态失败。";
    userManagementMessage.classList.add("error-note");
    return;
  }
  await fetchProfilesForAdmin();
  renderUserManagementPanel();
};

function openResetPasswordForm(user) {
  resetPasswordTargetUser = user;
  resetPasswordPanel.classList.remove("is-hidden");
  resetPasswordTargetText.textContent = `正在重置：${user.displayName}（${user.username}）`;
  resetPasswordForm.reset();
  resetPasswordMessage.textContent = "";
  resetPasswordMessage.classList.remove("error-note");
  resetPasswordPanel.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeResetPasswordForm() {
  resetPasswordTargetUser = null;
  resetPasswordPanel.classList.add("is-hidden");
  resetPasswordForm.reset();
  resetPasswordMessage.textContent = "";
  resetPasswordMessage.classList.remove("error-note");
}

async function resetTeacherPassword() {
  if (!canManageUsers()) throw new Error("not_admin");
  if (!resetPasswordTargetUser) throw new Error("target_user_not_found");
  const formData = new FormData(resetPasswordForm);
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const validationError = getPasswordValidationError("", newPassword, confirmPassword, false);
  if (validationError) throw new Error(validationError);

  const token = await getCloudAccessToken();
  const response = await fetch("/api/admin-reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: resetPasswordTargetUser.id, newPassword }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "reset_password_failed");
}

async function fetchProfilesForAdmin() {
  if (!isAdmin()) {
    cloudProfiles = [];
    return [];
  }
  const { data, error } = await cloudSupabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  cloudProfiles = (data || []).map(mapProfile);
  return cloudProfiles;
}

renderLoginPanel = function renderCloudLoginPanel() {
  if (!cloudAuthReady) {
    accountPanel.classList.add("is-hidden");
    initialAdminEntry.classList.add("is-hidden");
    initialAdminForm.classList.add("is-hidden");
    userLoginForm.classList.add("is-hidden");
    return;
  }
  const user = getCurrentUser();
  accountPanel.classList.toggle("is-hidden", Boolean(user));
  initialAdminEntry.classList.toggle("is-hidden", Boolean(user));
  initialAdminForm.classList.toggle("is-hidden", Boolean(user) || !showInitialAdminForm);
  userLoginForm.classList.toggle("is-hidden", Boolean(user));
  toggleInitialAdminButton.textContent = showInitialAdminForm ? "收起初始化管理员" : "首次部署？初始化管理员";
  accountPanelTitle.textContent = user ? `已登录：${user.displayName}` : "请先登录云端账号后使用心灵画卷";
  accountMessage.textContent = user
    ? "账号已登录。"
    : "当前为云端账号系统第一版，不开放公众注册。教师账号由机构管理员创建，请勿上传学生真实姓名、身份证号、详细住址等敏感信息。";
};

renderUserManagementPanel = async function renderCloudUserManagementPanel() {
  if (!canManageUsers()) return;
  userManagementMessage.textContent = "";
  userManagementMessage.classList.remove("error-note");
  userListBody.innerHTML = "";
  try {
    await fetchProfilesForAdmin();
  } catch (error) {
    userManagementMessage.textContent = "读取账号列表失败，请稍后重试。";
    userManagementMessage.classList.add("error-note");
  }

  if (!cloudProfiles.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "暂无用户";
    row.appendChild(cell);
    userListBody.appendChild(row);
    return;
  }

  const current = getCurrentUser();
  for (const user of cloudProfiles) {
    const row = document.createElement("tr");
    const values = [user.username, user.displayName, getRoleLabel(user.role), user.isActive === false ? "停用" : "启用", user.createdAt ? formatRecordTime(user.createdAt) : "未知"];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "ghost-button table-button";
    button.type = "button";
    button.textContent = user.isActive === false ? "启用" : "停用";
    button.disabled = current?.id === user.id || user.role === "admin";
    button.addEventListener("click", () => updateUserStatus(user.id, user.isActive === false));
    actionCell.appendChild(button);
    if (user.role === "teacher") {
      const resetButton = document.createElement("button");
      resetButton.className = "ghost-button table-button";
      resetButton.type = "button";
      resetButton.textContent = "重置密码";
      resetButton.addEventListener("click", () => openResetPasswordForm(user));
      actionCell.appendChild(resetButton);
    }
    row.appendChild(actionCell);
    userListBody.appendChild(row);
  }
};

function normalizeOrganizationRow(row = {}) {
  return {
    organizationName: sanitizeText(row.name),
    organizationType: sanitizeText(row.organization_type),
    usageScenario: sanitizeText(row.usage_scenario),
    reportSignature: sanitizeText(row.report_signature),
    organizationNote: sanitizeText(row.note),
  };
}

async function loadOrganizationFromCloud() {
  if (!currentCloudProfile?.organizationId) {
    currentCloudOrganization = null;
    return null;
  }
  const { data, error } = await cloudSupabase.from("organizations").select("*").eq("id", currentCloudProfile.organizationId).single();
  if (error) throw error;
  currentCloudOrganization = normalizeOrganizationRow(data);
  return currentCloudOrganization;
}

getOrganizationProfile = function getCloudOrganizationProfile() {
  return currentCloudOrganization || {
    organizationName: "",
    organizationType: "",
    usageScenario: "",
    reportSignature: "",
    organizationNote: "",
  };
};

saveOrganizationProfile = async function saveCloudOrganizationProfile() {
  if (!canEditOrganizationProfile() || !currentCloudProfile?.organizationId) return;
  const formData = new FormData(organizationForm);
  const payload = {
    name: sanitizeText(formData.get("organizationName")),
    organization_type: sanitizeText(formData.get("organizationType")),
    usage_scenario: sanitizeText(formData.get("usageScenario")),
    report_signature: sanitizeText(formData.get("reportSignature")),
    note: sanitizeText(formData.get("organizationNote")),
    updated_at: new Date().toISOString(),
  };
  const { error } = await cloudSupabase.from("organizations").update(payload).eq("id", currentCloudProfile.organizationId);
  if (error) {
    alert("机构信息保存失败，请稍后重试。");
    return;
  }
  await loadOrganizationFromCloud();
  applyOrganizationProfileToUI();
};

clearOrganizationProfile = async function clearCloudOrganizationProfile() {
  if (!canEditOrganizationProfile() || !currentCloudProfile?.organizationId) return;
  const { error } = await cloudSupabase
    .from("organizations")
    .update({ name: "", organization_type: "", usage_scenario: "", report_signature: "", note: "", updated_at: new Date().toISOString() })
    .eq("id", currentCloudProfile.organizationId);
  if (error) {
    alert("机构信息清空失败，请稍后重试。");
    return;
  }
  await loadOrganizationFromCloud();
  renderOrganizationProfile();
  applyOrganizationProfileToUI();
};

getUsageRecords = function getCloudUsageRecords() {
  return cloudUsageRecords;
};

async function fetchUsageRecordsFromCloud() {
  if (!getCurrentUser()) {
    cloudUsageRecords = [];
    return cloudUsageRecords;
  }
  const { data, error } = await cloudSupabase.from("usage_records").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  cloudUsageRecords = (data || []).map((record) => ({
    id: String(record.id || createUsageId()),
    createdAt: String(record.created_at || new Date().toISOString()),
    contentType: normalizeContentType(record.content_type),
    isRiskRelated: record.is_risk_related === true,
    teacherAlias: normalizeTeacherAlias(record.teacher_alias),
    userId: String(record.user_id || ""),
    username: String(record.username || ""),
    userRole: String(record.user_role || ""),
  }));
  return cloudUsageRecords;
}

saveUsageRecord = async function saveCloudUsageRecord(contentType) {
  const user = getCurrentUser();
  if (!user) return;
  const safeType = normalizeContentType(contentType);
  const { error } = await cloudSupabase.from("usage_records").insert({
    organization_id: user.organizationId,
    user_id: user.id,
    username: user.username,
    teacher_alias: user.displayName,
    user_role: user.role,
    content_type: safeType,
    is_risk_related: safeType === "风险提示与转介建议",
  });
  if (error) {
    setStatus("云端统计记录保存失败，请稍后检查。", true);
    return;
  }
  await fetchUsageRecordsFromCloud();
};

renderUsageStats = async function renderCloudUsageStats() {
  try {
    await fetchUsageRecordsFromCloud();
  } catch {
    cloudUsageRecords = [];
  }
  applyOrganizationProfileToUI();
  const previousFilter = getSelectedTeacherFilter();
  const teacherOptions = isAdmin() ? getTeacherOptions(getUsageRecords()) : [getCurrentTeacher()];
  teacherFilterSelect.innerHTML = "";
  for (const optionValue of teacherOptions) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    teacherFilterSelect.appendChild(option);
  }
  teacherFilterSelect.value = isAdmin() && teacherOptions.includes(previousFilter) ? previousFilter : teacherOptions[0];

  const stats = getUsageStats(getSelectedTeacherFilter());
  todayCount.textContent = stats.todayTotal;
  totalCount.textContent = stats.total;
  riskCount.textContent = stats.riskTotal;
  overviewTotalCount.textContent = stats.total;

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
    emptyCell.textContent = "暂无云端统计记录";
    emptyRow.appendChild(emptyCell);
    recentRecordsBody.appendChild(emptyRow);
    return;
  }
  for (const record of stats.recentRecords) {
    const row = document.createElement("tr");
    const cells = [formatRecordTime(record.createdAt), normalizeTeacherAlias(record.teacherAlias), record.contentType, record.isRiskRelated ? "是" : "否"];
    for (const value of cells) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
    recentRecordsBody.appendChild(row);
  }
};

clearUsageRecords = function clearCloudUsageRecords() {
  alert("v0.4 云端统计清空将在后续版本通过后端接口实现。当前版本不会删除云端记录。");
};

exportUsageRecords = function exportCloudUsageRecords() {
  const teacherFilter = getSelectedTeacherFilter();
  const records = isAdmin() ? filterUsageRecordsByTeacher(getUsageRecords(), teacherFilter) : getUsageRecords();
  const payload = {
    exportedAt: new Date().toISOString(),
    teacherFilter,
    note: "仅包含云端安全使用统计元数据，不包含学生资料、图片、背景资料正文或 AI 报告正文。",
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `soul-painting-cloud-usage-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function cnAuthErrorMessage(code) {
  const messages = {
    admin_already_exists: "系统已有管理员，请直接登录。",
    invalid_cn_admin_init_code: "初始化码不正确。",
    cn_admin_init_code_missing: "服务器尚未配置大陆版管理员初始化码。",
    cn_session_secret_missing: "服务器尚未配置大陆版会话密钥。",
    invalid_username: "用户名只能包含字母、数字、下划线、短横线，长度 3-32 位。",
    username_exists: "用户名已存在，请直接登录或更换用户名。",
    password_too_short: "密码至少需要 8 位。",
    password_too_long: "密码长度超出限制。",
    missing_organization_name: "机构名称不能为空。",
    invalid_username_or_password: "用户名或密码不正确。",
    authentication_required: "请先登录。",
    admin_required: "只有管理员可以执行此操作。",
    username_already_exists: "该用户名已存在。",
    display_name_required: "教师姓名或显示名不能为空。",
    user_not_found: "未找到该教师账号。",
    user_inactive: "该账号已被停用。",
    cannot_disable_self: "管理员不能停用自己的账号。",
    cannot_disable_last_admin: "不能停用最后一个有效管理员。",
    cannot_reset_self_password: "请通过“修改自己的密码”修改管理员密码。",
    invalid_current_password: "当前密码不正确。",
    passwords_do_not_match: "两次输入的密码不一致。",
    password_same_as_current: "新密码不能与当前密码相同。",
    password_change_required: "首次登录或密码被重置后，请先修改密码。",
    session_invalid: "登录状态已失效，请重新登录。",
    organization_name_required: "机构名称不能为空。",
    organization_not_found: "未找到当前账号所属机构。",
    cn_organization_read_failed: "机构信息读取失败，请稍后重试。",
    cn_organization_update_failed: "机构信息保存失败，请稍后重试。",
    cn_usage_summary_failed: "使用统计读取失败，请稍后重试。",
    cn_usage_records_failed: "使用记录读取失败，请稍后重试。",
    invalid_backup_id: "\u6240\u9009\u5907\u4efd\u4e0d\u5b58\u5728\u6216\u5df2\u5931\u6548\uff0c\u8bf7\u5237\u65b0\u5907\u4efd\u5217\u8868\u540e\u91cd\u65b0\u9009\u62e9\u3002",
    backup_not_found: "\u6240\u9009\u5907\u4efd\u4e0d\u5b58\u5728\u6216\u5df2\u5931\u6548\uff0c\u8bf7\u5237\u65b0\u5907\u4efd\u5217\u8868\u540e\u91cd\u65b0\u9009\u62e9\u3002",
    invalid_backup_file: "\u5907\u4efd\u6587\u4ef6\u65e0\u6548\u6216\u4e0d\u517c\u5bb9\u3002",
    invalid_sqlite_header: "\u8bf7\u9009\u62e9\u6709\u6548\u7684 SQLite \u5907\u4efd\u6587\u4ef6\u3002",
    database_integrity_check_failed: "\u5907\u4efd\u6587\u4ef6\u5b8c\u6574\u6027\u6821\u9a8c\u5931\u8d25\u3002",
    incompatible_schema_version: "\u5907\u4efd\u6587\u4ef6\u7248\u672c\u9ad8\u4e8e\u5f53\u524d\u7cfb\u7edf\uff0c\u6682\u4e0d\u80fd\u5bfc\u5165\u3002",
    uploaded_backup_too_large: "\u5907\u4efd\u6587\u4ef6\u8fc7\u5927\u3002",
    backup_file_required: "\u8bf7\u9009\u62e9\u8981\u5bfc\u5165\u7684\u5907\u4efd\u6587\u4ef6\u3002",
  };
  return messages[code] || code || "大陆版账号服务暂时不可用。";
}

async function readCnResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(cnAuthErrorMessage(data.error || fallback));
  return data;
}

function cnToken() {
  return sessionStorage.getItem(cnSessionTokenKey) || "";
}

function clearCnSession() {
  sessionStorage.removeItem(cnSessionTokenKey);
  sessionStorage.removeItem(adminSettingsAccessKey);
  resetCnUsageFilters();
  currentCnUser = null;
  currentCnOrganization = null;
  currentCnUsageSummary = null;
  currentCnUsageRecords = [];
}

async function loadCnAuthStatus() {
  const response = await fetch("/api/cn-auth-status");
  const data = await readCnResponse(response, "cn_auth_status_failed");
  cnHasAdmin = Boolean(data.hasAdmin);
  showInitialAdminForm = !cnHasAdmin;
  return data;
}

async function loadCnCurrentUser() {
  const token = cnToken();
  if (!token) {
    currentCnUser = null;
    return null;
  }
  const response = await fetch("/api/cn-current-user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    clearCnSession();
    return null;
  }
  const data = await response.json().catch(() => ({}));
  currentCnUser = data.user || null;
  if (currentCnUser) await loadCnOrganization().catch(() => { currentCnOrganization = null; });
  return currentCnUser;
}

async function loadCnOrganization() {
  if (!getCurrentUser()) {
    currentCnOrganization = null;
    return null;
  }
  const data = await cnApi("/api/cn-organization");
  currentCnOrganization = data.organization || null;
  if (currentCnOrganization && currentCnUser) currentCnUser.organizationName = currentCnOrganization.name;
  applyOrganizationProfileToUI();
  clearOrganizationButton.classList.add("is-hidden");
  return currentCnOrganization;
}

async function saveCnOrganizationProfile() {
  if (!isAdmin()) throw new Error("admin_required");
  const formData = new FormData(organizationForm);
  const data = await cnApi("/api/cn-admin-organization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: sanitizeText(formData.get("organizationName")),
      organizationType: sanitizeText(formData.get("organizationType")),
      usageScenario: sanitizeText(formData.get("usageScenario")),
      reportSignature: sanitizeText(formData.get("reportSignature")),
      note: String(formData.get("organizationNote") || "").trim().slice(0, 500),
    }),
  });
  currentCnOrganization = data.organization;
  if (currentCnUser) currentCnUser.organizationName = currentCnOrganization.name;
  applyOrganizationProfileToUI();
  clearOrganizationButton.classList.add("is-hidden");
  organizationMessage.textContent = "机构信息已保存。";
  organizationMessage.classList.remove("error-note");
}

function cnUsageQuery() {
  const params = new URLSearchParams();
  if (isAdmin() && teacherFilterSelect.value) params.set("userId", teacherFilterSelect.value);
  if (usageDateFrom?.value) params.set("dateFrom", usageDateFrom.value);
  if (usageDateTo?.value) params.set("dateTo", usageDateTo.value);
  if (usageContentTypeFilter?.value) params.set("contentType", usageContentTypeFilter.value);
  return params;
}

function resetCnUsageFilters() {
  if (teacherFilterSelect) teacherFilterSelect.value = "";
  if (usageDateFrom) usageDateFrom.value = "";
  if (usageDateTo) usageDateTo.value = "";
  if (usageContentTypeFilter) usageContentTypeFilter.value = "";
}

function renderCountList(container, entries, emptyText) {
  container.innerHTML = "";
  if (!entries.length) {
    const row = document.createElement("div");
    row.className = "type-row";
    row.textContent = emptyText;
    container.appendChild(row);
    return;
  }
  for (const [labelText, count] of entries) {
    const row = document.createElement("div");
    row.className = "type-row";
    const label = document.createElement("span");
    const value = document.createElement("strong");
    label.textContent = labelText;
    value.textContent = String(count || 0);
    row.append(label, value);
    container.appendChild(row);
  }
}

function usageModelLabel(record) {
  return record.pipelineMode === "split"
    ? `${record.visionProvider || "-"}/${record.visionModel || "-"} → ${record.textProvider || "-"}/${record.textModel || "-"}`
    : `${record.singleProvider || "-"}/${record.singleModel || "-"}`;
}

async function renderCnUsageStats() {
  if (!getCurrentUser()) return;
  const query = cnUsageQuery();
  const suffix = query.toString() ? `?${query}` : "";
  try {
    const [summaryData, recordsData] = await Promise.all([
      cnApi(`/api/cn-usage-summary${suffix}`),
      cnApi(`/api/cn-usage-records${suffix}${suffix ? "&" : "?"}limit=100`),
    ]);
    currentCnUsageSummary = summaryData.summary;
    currentCnUsageRecords = Array.isArray(recordsData.records) ? recordsData.records : [];
  } catch (error) {
    recentRecordsBody.innerHTML = `<tr><td colspan="5">${escapeHtml(cnAuthErrorMessage(error.message))}</td></tr>`;
    return;
  }

  const summary = currentCnUsageSummary || {};
  todayCount.textContent = summary.todayCount || 0;
  totalCount.textContent = summary.totalCount || 0;
  riskCount.textContent = summary.riskRelatedCount || 0;
  overviewTotalCount.textContent = summary.totalCount || 0;

  renderCountList(typeStatsList, contentTypes.map((type) => [type, summary.contentTypeCounts?.[type] || 0]), "暂无报告类型统计");
  renderCountList(providerStatsList, Object.entries(summary.providerCounts || {}), "暂无模型使用统计");

  teacherStatsPanel?.classList.toggle("is-hidden", !isAdmin());
  providerStatsPanel?.classList.toggle("is-hidden", !isAdmin());
  riskStatCard?.classList.toggle("is-hidden", !isAdmin());
  teacherFilterField?.classList.toggle("is-hidden", !isAdmin());
  if (isAdmin()) {
    const selectedUserId = teacherFilterSelect.value;
    const teacherEntries = Object.entries(summary.teacherCounts || {});
    renderCountList(teacherStatsList, teacherEntries.map(([, item]) => [`${item.displayName || item.username}（${item.username}）`, item.count]), "暂无教师使用统计");
    if (!selectedUserId) {
      teacherFilterSelect.innerHTML = '<option value="">全部教师</option>';
      for (const [userId, item] of teacherEntries) {
        const option = document.createElement("option");
        option.value = userId;
        option.textContent = `${item.displayName || item.username}（${item.username}）`;
        teacherFilterSelect.appendChild(option);
      }
    }
  } else {
    teacherFilterSelect.innerHTML = `<option value="${escapeHtml(getCurrentUser().id)}">我的记录</option>`;
  }

  recentRecordsBody.innerHTML = "";
  if (!currentCnUsageRecords.length) {
    recentRecordsBody.innerHTML = '<tr><td colspan="5">暂无统计记录</td></tr>';
  } else {
    for (const record of currentCnUsageRecords.slice(0, 20)) {
      const row = document.createElement("tr");
      const values = [formatRecordTime(record.createdAt), record.teacherAlias || record.username, record.contentType, record.isRiskRelated ? "是" : "否", usageModelLabel(record)];
      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }
      recentRecordsBody.appendChild(row);
    }
  }
  applyOrganizationProfileToUI();
  clearOrganizationButton.classList.add("is-hidden");
}

function exportCnUsageJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    scope: isAdmin() ? "organization" : "self",
    summary: currentCnUsageSummary,
    records: currentCnUsageRecords,
    note: "仅包含安全使用元数据，不包含学生信息、图片、背景资料、报告正文、密钥或 token。",
  };
  downloadBlobFile(JSON.stringify(payload, null, 2), `xinling-usage-statistics-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`, "application/json;charset=utf-8");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCnUsageCsv() {
  const headers = ["生成时间", "教师用户名", "教师显示名", "角色", "报告类型", "风险相关", "工作模式", "模型组合"];
  const lines = [headers.map(csvCell).join(",")];
  for (const record of currentCnUsageRecords) {
    lines.push([
      record.createdAt,
      record.username,
      record.teacherAlias,
      record.userRole,
      record.contentType,
      record.isRiskRelated ? "是" : "否",
      record.pipelineMode,
      usageModelLabel(record),
    ].map(csvCell).join(","));
  }
  downloadBlobFile(`\uFEFF${lines.join("\r\n")}`, `xinling-usage-statistics-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv`, "text/csv;charset=utf-8");
}

function renderCnPermissionUI() {
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const passwordChangeRequired = false;
  accountSecurityPanel?.classList.toggle("is-hidden", !user);
  userManagementPanel.classList.toggle("is-hidden", !admin);
  organizationSettingsPanel?.classList.toggle("is-hidden", !user);
  modelSettingsPanel.classList.toggle("is-hidden", !admin);
  systemStatusPanel?.classList.toggle("is-hidden", !admin);
  backupPanel?.classList.toggle("is-hidden", !admin);
  if (!admin) sessionStorage.removeItem(adminSettingsAccessKey);
  teacherFilterSelect.disabled = true;
  clearStatsButton.classList.add("is-hidden");
  clearCurrentTeacherStatsButton.classList.add("is-hidden");
  if (user && !passwordChangeRequired) {
    for (const element of organizationForm.elements) element.disabled = !admin;
    saveOrganizationButton.classList.toggle("is-hidden", !admin);
    clearOrganizationButton.classList.add("is-hidden");
    organizationMessage.textContent = admin ? "管理员可以修改本机构信息。" : "机构信息由管理员维护，教师账号仅可查看。";
  }
  if (admin && !passwordChangeRequired) {
    renderUserManagementPanel();
    loadSystemStatus().catch(() => {});
    loadBackups().catch(() => {});
}
}

function renderCnLoginPanel() {
  const user = getCurrentUser();
  const passwordChangeRequired = false;
  accountPanel.classList.toggle("is-hidden", Boolean(user));
  passwordChangeGate?.classList.toggle("is-hidden", !passwordChangeRequired);
  initialAdminEntry.classList.toggle("is-hidden", Boolean(user) || cnHasAdmin);
  initialAdminForm.classList.toggle("is-hidden", Boolean(user) || cnHasAdmin || !showInitialAdminForm);
  userLoginForm.classList.toggle("is-hidden", Boolean(user) || !cnHasAdmin);
  toggleInitialAdminButton.textContent = showInitialAdminForm ? "收起初始化管理员" : "初始化管理员";
  accountPanelTitle.textContent = cnHasAdmin ? "大陆版登录" : "初始化大陆版管理员";
  accountMessage.textContent = cnHasAdmin
    ? "请输入机构管理员或教师账号。登录状态仅保留在本次浏览器会话中。"
    : "系统尚未初始化管理员，请由部署者完成首次初始化。";
  accountMessage.classList.remove("error-note");

  const workspaceAllowed = Boolean(user) && !passwordChangeRequired;
  teacherIdentityPanel?.classList.toggle("is-hidden", !workspaceAllowed);
  analysisViewButton.classList.toggle("is-hidden", !workspaceAllowed);
  dashboardViewButton.classList.toggle("is-hidden", !workspaceAllowed);
  analysisView.classList.toggle("is-hidden", !workspaceAllowed);
  if (!workspaceAllowed) dashboardView.classList.add("is-hidden");
  renderCnPermissionUI();
}

async function loginCnAccount(username, password) {
  const response = await fetch("/api/cn-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await readCnResponse(response, "cn_login_failed");
  resetCnUsageFilters();
  resetWorkspace();
  sessionStorage.setItem(cnSessionTokenKey, data.token);
  currentCnUser = data.user;
  await loadCnOrganization().catch(() => { currentCnOrganization = null; });
  return data.user;
}

async function cnApi(path, options = {}) {
  const token = cnToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers });
  return readCnResponse(response, "cn_account_request_failed");
}

async function fetchCnUsers() {
  if (!isAdmin()) return [];
  const data = await cnApi("/api/cn-admin-users");
  cnUsers = Array.isArray(data.users) ? data.users : [];
  return cnUsers;
}

async function renderCnUserManagementPanel() {
  if (!isAdmin()) {
    userManagementPanel.classList.add("is-hidden");
    return;
  }
  userManagementPanel.classList.remove("is-hidden");
  userManagementMessage.textContent = "正在读取教师账号…";
  userManagementMessage.classList.remove("error-note");
  try {
    await fetchCnUsers();
  } catch (error) {
    userManagementMessage.textContent = cnAuthErrorMessage(error.message);
    userManagementMessage.classList.add("error-note");
    return;
  }
  userManagementMessage.textContent = "账号列表已更新。";
  userListBody.innerHTML = "";
  if (!cnUsers.length) {
    userListBody.innerHTML = '<tr><td colspan="8">暂无账号</td></tr>';
    return;
  }

  for (const user of cnUsers) {
    const row = document.createElement("tr");
    const values = [
      user.username,
      user.displayName,
      getRoleLabel(user.role),
      user.isActive ? "正常" : "已停用",
      user.mustChangePassword ? "是" : "否",
      user.createdAt ? formatRecordTime(user.createdAt) : "—",
      user.lastLoginAt ? formatRecordTime(user.lastLoginAt) : "从未登录",
    ];
    values.splice(4, 1);
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
    const actions = document.createElement("td");
    if (user.role === "teacher") {
      const statusButton = document.createElement("button");
      statusButton.type = "button";
      statusButton.className = "ghost-button table-button";
      statusButton.textContent = user.isActive ? "停用" : "启用";
      statusButton.addEventListener("click", async () => {
        const action = user.isActive ? "停用" : "启用";
        if (!confirm(`确定要${action}教师账号“${user.displayName}（${user.username}）”吗？`)) return;
        try {
          await updateUserStatus(user.id, !user.isActive);
          userManagementMessage.textContent = `教师账号已${action}。`;
          userManagementMessage.classList.remove("error-note");
        } catch (error) {
          userManagementMessage.textContent = cnAuthErrorMessage(error.message);
          userManagementMessage.classList.add("error-note");
        }
      });
      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "ghost-button table-button";
      resetButton.textContent = "重置密码";
      resetButton.addEventListener("click", () => openResetPasswordForm(user));
      actions.append(statusButton, resetButton);
    } else {
      actions.textContent = "—";
    }
    row.appendChild(actions);
    userListBody.appendChild(row);
  }
}

async function createCnTeacher(formData) {
  const temporaryPassword = String(formData.get("temporaryPassword") || "");
  const confirmTemporaryPassword = String(formData.get("confirmTemporaryPassword") || "");
  if (temporaryPassword.length < 8) throw new Error("password_too_short");
  if (temporaryPassword !== confirmTemporaryPassword) throw new Error("passwords_do_not_match");
  await cnApi("/api/cn-admin-create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: normalizeUsername(formData.get("username")),
      displayName: sanitizeText(formData.get("displayName")),
      temporaryPassword,
    }),
  });
  createTeacherForm.reset();
  await renderCnUserManagementPanel();
}

async function updateCnUserStatus(userId, isActive) {
  await cnApi("/api/cn-admin-update-user-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, isActive }),
  });
  await renderCnUserManagementPanel();
}

async function resetCnTeacherPassword() {
  if (!resetPasswordTargetUser) throw new Error("user_not_found");
  const formData = new FormData(resetPasswordForm);
  const newTemporaryPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (newTemporaryPassword.length < 8) throw new Error("password_too_short");
  if (newTemporaryPassword !== confirmPassword) throw new Error("passwords_do_not_match");
  if (!confirm(`确定要重置教师账号“${resetPasswordTargetUser.displayName}（${resetPasswordTargetUser.username}）”的密码吗？该教师现有登录会立即失效。`)) return false;
  await cnApi("/api/cn-admin-reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: resetPasswordTargetUser.id, newTemporaryPassword }),
  });
  closeResetPasswordForm();
  await renderCnUserManagementPanel();
  return true;
}

async function changeCnCurrentPassword(formData) {
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || formData.get("confirmNewPassword") || "");
  if (newPassword.length < 8) throw new Error("password_too_short");
  if (newPassword !== confirmPassword) throw new Error("passwords_do_not_match");
  await cnApi("/api/cn-change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  clearCnSession();
  renderCurrentUserInfo();
  renderLoginPanel();
  showInternalApp();
  accountMessage.textContent = "密码修改成功，请使用新密码重新登录。";
  accountMessage.classList.remove("error-note");
}

function configureCnAuth() {
  cnAuthMode = true;
  cloudAuthReady = true;
  sessionStorage.removeItem(accessStateKey);
  sessionStorage.removeItem(accessCodeKey);

  getCurrentUser = function getCurrentCnUser() {
    return currentCnUser;
  };
  isAdmin = function isCnAdmin(user = getCurrentUser()) {
    return user?.role === "admin";
  };
  isTeacher = function isCnTeacher(user = getCurrentUser()) {
    return user?.role === "teacher";
  };
  requireLogin = function requireCnLogin(message = "请先登录后使用心灵画卷。") {
    if (getCurrentUser()) return true;
    setStatus(message, true);
    renderLoginPanel();
    return false;
  };
  getCloudAccessToken = async function getCnAccessToken() {
    const token = cnToken();
    if (!token || !getCurrentUser()) throw new Error("请先登录后生成报告。");
    return token;
  };
  setCurrentUser = function setCurrentCnUser(user) {
    currentCnUser = user || null;
    renderCurrentUserInfo();
    renderLoginPanel();
    renderPermissionUI();
    renderUsageStats();
  };
  getOrganizationProfile = function getCnOrganizationProfile() {
    return {
      organizationName: currentCnOrganization?.name || currentCnUser?.organizationName || "",
      organizationType: currentCnOrganization?.organizationType || "",
      usageScenario: currentCnOrganization?.usageScenario || "",
      reportSignature: currentCnOrganization?.reportSignature || "",
      organizationNote: currentCnOrganization?.note || "",
    };
  };
  createInitialAdmin = async function createInitialCnAdmin(formData) {
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (password.length < 8) throw new Error("密码至少需要 8 位。");
    if (password !== confirmPassword) throw new Error("两次密码不一致。");
    const payload = {
      initCode: String(formData.get("initCode") || ""),
      organizationName: sanitizeText(formData.get("organizationName")),
      username: normalizeUsername(formData.get("username")),
      displayName: sanitizeText(formData.get("displayName")),
      password,
    };
    const response = await fetch("/api/cn-bootstrap-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 409) {
      cnHasAdmin = true;
      showInitialAdminForm = false;
      renderLoginPanel();
    }
    await readCnResponse(response, "cn_bootstrap_admin_failed");
    cnHasAdmin = true;
    showInitialAdminForm = false;
    const user = await loginCnAccount(payload.username, password);
    renderCurrentUserInfo();
    renderLoginPanel();
    renderPermissionUI();
    renderUsageStats();
    return user;
  };
  loginUser = async function loginCnUser(formData) {
    const username = normalizeUsername(formData.get("username"));
    const password = String(formData.get("password") || "");
    if (!isValidUsername(username)) throw new Error("登录账号格式不正确。");
    await loginCnAccount(username, password);
    renderCurrentUserInfo();
    renderLoginPanel();
    renderPermissionUI();
    renderUsageStats();
  };
  logoutUser = async function logoutCnUser() {
    const token = cnToken();
    resetWorkspace();
    try {
      if (token) {
        await fetch("/api/cn-logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // 本地会话仍必须清除，避免网络异常时上一账号的工作内容留在页面中。
    } finally {
      clearCnSession();
      resetWorkspace();
      renderCurrentUserInfo();
      renderLoginPanel();
      showAnalysisView();
      renderUsageStats();
    }
  };
  renderLoginPanel = renderCnLoginPanel;
  renderPermissionUI = renderCnPermissionUI;
  renderUserManagementPanel = renderCnUserManagementPanel;
  getUsageRecords = function getCnUsageRecords() { return currentCnUsageRecords; };
  saveUsageRecord = async function refreshCnUsageAfterReport() { await renderCnUsageStats(); };
  renderUsageStats = renderCnUsageStats;
  saveOrganizationProfile = async function saveCnOrganization() {
    try {
      await saveCnOrganizationProfile();
    } catch (error) {
      organizationMessage.textContent = cnAuthErrorMessage(error.message);
      organizationMessage.classList.add("error-note");
    }
  };
  clearOrganizationProfile = function keepRequiredCnOrganization() {};
  exportUsageRecords = exportCnUsageJson;
  exportUsageRecordsCsv = exportCnUsageCsv;
  changeCurrentUserPassword = changeCnCurrentPassword;
  createTeacherUser = createCnTeacher;
  updateUserStatus = updateCnUserStatus;
  resetTeacherPassword = resetCnTeacherPassword;

  const baseShowAnalysisView = showAnalysisView;
  showAnalysisView = function showCnAnalysisView() {
    if (!getCurrentUser()) {
      analysisView.classList.add("is-hidden");
      dashboardView.classList.add("is-hidden");
      return;
    }
    baseShowAnalysisView();
  };
  showInternalApp = function showCnInternalApp() {
    publicHomeView.classList.add("is-hidden");
    loginScreen.classList.add("is-hidden");
    appShell.classList.remove("is-hidden");
    renderCurrentUserInfo();
    renderLoginPanel();
    if (getCurrentUser()) showAnalysisView();
  };
}

async function initializeApp() {
  updateGenerateLabels();
  try {
    const response = await fetch("/api/supabase-config");
    const config = await response.json().catch(() => ({}));
    const useCnAuth = config.appRegion === "cn" || config.authProvider === "cn-dev" || !config.url || !config.anonKey;
    if (useCnAuth) {
      configureCnAuth();
      await loadCnAuthStatus();
      await loadCnCurrentUser();
    } else {
      await initSupabaseClient();
      await loadCurrentSession();
      cloudAuthReady = true;
    }
  } catch (error) {
    if (cnAuthMode) {
      clearCnSession();
      accountMessage.textContent = cnAuthErrorMessage(error.message);
      accountMessage.classList.add("error-note");
    } else {
      cloudAuthReady = false;
      accountMessage.textContent = "账号服务暂时不可用，请检查服务器配置。";
      accountMessage.classList.add("error-note");
    }
  }
  renderCurrentUserInfo();
  renderLoginPanel();
  renderCurrentTeacher();
  applyOrganizationProfileToUI();
  restoreAccess();
}

initializeApp();
