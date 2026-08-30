const readline = require("node:readline");
const { loadRuntimeConfig } = require("../config/loadRuntimeConfig");

loadRuntimeConfig();

const {
  listLocalAdminsForPasswordReset,
  resetLocalAdminPassword,
} = require("../services/authService");
const { closeDatabase, databasePath } = require("../services/db");

function readLine(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (answer) => {
    rl.close();
    resolve(String(answer || "").trim());
  }));
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("interactive_terminal_required");
  }
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === "\u0003") return finish(new Error("operation_cancelled"));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\b" || character === "\u007f") {
          value = value.slice(0, -1);
        } else if (character >= " ") {
          value += character;
        }
      }
    };
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

function safeMessage(error) {
  const code = String(error?.message || "admin_password_reset_failed");
  const messages = {
    interactive_terminal_required: "请在本机终端或双击批处理文件运行此工具。",
    operation_cancelled: "操作已取消。",
    invalid_admin_selection: "管理员选择无效。",
    admin_not_found: "所选管理员不存在，未修改数据库。",
    password_too_short: "新密码至少需要 8 个字符。",
    password_too_long: "新密码不能超过 256 个字符。",
    passwords_do_not_match: "两次输入的新密码不一致。",
  };
  return messages[code] || "管理员密码重置失败，数据库未完成修改。";
}

async function main() {
  console.log("警告：重置前请先运行“备份数据库.bat”，确认备份创建成功后再继续。");
  console.log(`当前数据库：${databasePath}`);
  const proceed = (await readLine("已完成数据库备份并继续？请输入 YES：")).toUpperCase();
  if (proceed !== "YES") throw new Error("operation_cancelled");

  const admins = listLocalAdminsForPasswordReset();
  if (!admins.length) throw new Error("admin_not_found");
  console.log("\n现有管理员账号：");
  admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.displayName} (${admin.username}) [${admin.isActive ? "启用" : "停用"}]`);
  });
  const selected = Number.parseInt(await readLine("请选择管理员序号："), 10);
  if (!Number.isInteger(selected) || selected < 1 || selected > admins.length) {
    throw new Error("invalid_admin_selection");
  }
  const admin = admins[selected - 1];
  console.log(`即将重置管理员：${admin.displayName} (${admin.username})`);
  const newPassword = await readHidden("请输入新密码（至少 8 个字符，输入不会显示）：");
  const confirmPassword = await readHidden("请再次输入新密码（输入不会显示）：");
  await resetLocalAdminPassword({
    userId: admin.id,
    newPassword,
    confirmPassword,
  });
  console.log("管理员密码已安全重置。该账号原有登录会话已全部失效，请使用新密码重新登录。");
}

main()
  .catch((error) => {
    console.error(safeMessage(error));
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
