// npm run hash-password
// Prints an ADMIN_PASSWORD_HASH line for .env. The password is typed without
// echo and never stored; each "$" in the hash is escaped as "\$" because
// Next.js expands "$" in .env files.
import bcrypt from "bcryptjs";

const MIN_LENGTH = 12;

function readHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);

    if (!stdin.isTTY) {
      // Piped input: read the first line.
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (data += chunk));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
      return;
    }

    let value = "";
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    const onData = (key: string) => {
      if (key === "\r" || key === "\n" || key === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (key === "\u0003") {
        process.stdout.write("\n");
        process.exit(130);
      } else if (key === "\u007f" || key === "\b") {
        value = value.slice(0, -1);
      } else {
        value += key;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await readHidden("Admin password (input hidden): ");
if (password.length < MIN_LENGTH) {
  console.error(`Use at least ${MIN_LENGTH} characters.`);
  process.exit(1);
}
if (process.stdin.isTTY) {
  const again = await readHidden("Type it again: ");
  if (again !== password) {
    console.error("The two passwords don't match.");
    process.exit(1);
  }
}

const hash = await bcrypt.hash(password, 12);
console.log("\nAdd this line to .env:\n");
console.log(`ADMIN_PASSWORD_HASH=${hash.replaceAll("$", "\\$")}`);
