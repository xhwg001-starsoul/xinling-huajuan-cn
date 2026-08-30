const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "xinling-admin-reset-"));
const tempDatabase = path.join(tempDir, "auth-reset-test.db");
process.env.CN_DATABASE_PATH = tempDatabase;
process.env.CN_ADMIN_INIT_CODE = "offline-init-code";
process.env.CN_SESSION_SECRET = "offline-session-secret-only-for-test";

const {
  bootstrapAdmin,
  createTeacher,
  listLocalAdminsForPasswordReset,
  login,
  requireCurrentUser,
  resetLocalAdminPassword,
  verifyPassword,
} = require("../services/authService");
const { closeDatabase, getDatabase } = require("../services/db");

async function main() {
  const admin = await bootstrapAdmin({
    initCode: "offline-init-code",
    organizationName: "临时测试机构",
    username: "admin_test",
    displayName: "测试管理员",
    password: "OldPassword!123",
  });
  const initialLogin = await login({ username: "admin_test", password: "OldPassword!123", req: {} });
  const teacher = await createTeacher({
    token: initialLogin.token,
    username: "teacher_test",
    displayName: "测试教师",
    temporaryPassword: "TeacherPass!123",
  });
  const db = getDatabase();
  const organizationBefore = db.prepare("SELECT * FROM organizations WHERE id = ?").get(admin.organizationId);
  const teacherBefore = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(teacher.id);
  const adminBefore = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(admin.id);

  assert.deepEqual(listLocalAdminsForPasswordReset().map((item) => item.username), ["admin_test"]);
  await assert.rejects(
    resetLocalAdminPassword({ userId: teacher.id, newPassword: "NewPassword!456", confirmPassword: "NewPassword!456" }),
    /admin_not_found/
  );
  assert.equal(db.prepare("SELECT password_hash FROM users WHERE id = ?").get(teacher.id).password_hash, teacherBefore.password_hash);

  db.exec(`
    CREATE TRIGGER test_force_reset_rollback
    BEFORE DELETE ON sessions
    WHEN OLD.user_id = '${admin.id}'
    BEGIN
      SELECT RAISE(ABORT, 'forced rollback test');
    END;
  `);
  await assert.rejects(
    resetLocalAdminPassword({ userId: admin.id, newPassword: "RollbackPass!456", confirmPassword: "RollbackPass!456" }),
    /forced rollback test/
  );
  assert.equal(db.prepare("SELECT password_hash FROM users WHERE id = ?").get(admin.id).password_hash, adminBefore.password_hash);
  db.exec("DROP TRIGGER test_force_reset_rollback");

  await resetLocalAdminPassword({
    userId: admin.id,
    newPassword: "NewPassword!456",
    confirmPassword: "NewPassword!456",
  });
  const adminAfter = db.prepare("SELECT * FROM users WHERE id = ?").get(admin.id);
  assert.equal(await verifyPassword("OldPassword!123", adminAfter.password_hash), false);
  assert.equal(await verifyPassword("NewPassword!456", adminAfter.password_hash), true);
  assert.equal(adminAfter.must_change_password, 0);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM sessions WHERE user_id = ?").get(admin.id).count, 0);
  assert.throws(() => requireCurrentUser(initialLogin.token), /session_invalid/);
  assert.deepEqual(db.prepare("SELECT * FROM organizations WHERE id = ?").get(admin.organizationId), organizationBefore);
  assert.equal(db.prepare("SELECT password_hash FROM users WHERE id = ?").get(teacher.id).password_hash, teacherBefore.password_hash);
  await login({ username: "admin_test", password: "NewPassword!456", req: {} });
  console.log("ok - 临时数据库管理员密码重置、会话撤销和事务回滚测试通过");
}

main()
  .catch((error) => {
    console.error(error?.message || "reset_admin_password_test_failed");
    process.exitCode = 1;
  })
  .finally(() => {
    closeDatabase();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${tempDatabase}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(tempDir);
  });
