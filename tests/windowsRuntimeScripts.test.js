const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const windowsDir = path.resolve(__dirname, "..", "scripts", "windows");
const read = (name) => fs.readFileSync(path.join(windowsDir, name), "utf8");

const start = read("start.ps1");
const restart = read("restart.ps1");
const stop = read("stop.ps1");
const status = read("status.ps1");
const common = read("common.ps1");

assert.match(start, /Get-XinlingRuntimeStatus/);
assert.match(start, /PortListenerPid/);
assert.match(start, /Started at/);
assert.match(start, /Runtime version/);
assert.doesNotMatch(start, /Stop-Process|taskkill/i);
assert.match(restart, /stop\.ps1/);
assert.match(restart, /restart_port_not_released/);
assert.match(restart, /after\.PidValue -eq \$oldPid/);
assert.match(restart, /Restart verified/);
assert.match(stop, /CommandLineValidation -eq "matched"/);
assert.doesNotMatch(stop, /node\.exe|taskkill\s+\/im/i);
assert.match(status, /Runtime version/);
assert.match(status, /Server started at/);
assert.match(common, /application -eq "xinling-huajuan-cn"/);
assert.match(common, /Get-XinlingCommandLineValidation \$portListenerPid/);

console.log("ok - Windows start/restart/status validate project PID, port, health identity and runtime version");
