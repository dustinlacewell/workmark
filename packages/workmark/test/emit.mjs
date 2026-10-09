// Test child process. Each argument is one step:
//   out:<text>  write <text>\n to stdout     raw:<text>  write <text> to stdout
//   err:<text>  write <text>\n to stderr     sleep:<ms>  wait
//   exit:<n>    exit with code n
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const step of process.argv.slice(2)) {
  const sep = step.indexOf(":");
  const kind = step.slice(0, sep);
  const value = step.slice(sep + 1);
  if (kind === "out") process.stdout.write(value + "\n");
  else if (kind === "raw") process.stdout.write(value);
  else if (kind === "err") process.stderr.write(value + "\n");
  else if (kind === "sleep") await sleep(Number(value));
  else if (kind === "exit") process.exit(Number(value));
}
