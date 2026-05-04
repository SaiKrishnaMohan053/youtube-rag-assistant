const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function getJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) return getJsFiles(fullPath);

    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

const files = getJsFiles(path.join(process.cwd(), "src"));

for (const file of files) {
  execFileSync("node", ["--check", file], { stdio: "inherit" });
}

console.log(`Checked ${files.length} JS files successfully.`);