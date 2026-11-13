import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));

/** @param {Record<string, string | undefined>} env */
export function resolveAppMode(env = process.env, directory = root) {
  let mode = env.APP_MODE;
  for (const name of [".env.local", ".env"]) {
    if (mode !== undefined) break;
    const file = resolve(directory, name);
    if (existsSync(file)) mode = parseEnv(readFileSync(file, "utf8")).APP_MODE;
  }
  // Existing installations keep password authentication unless explicitly changed.
  mode ??= "standard";
  if (mode !== "demo" && mode !== "standard") {
    throw new Error("APP_MODE debe ser demo o standard.");
  }
  return mode;
}

export function demoEnvironment(env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) =>
    !/(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY)|^(?:SUPABASE|GOOGLE_|OPENROUTER_|NVIDIA_|MEM0_|VITE_|NEXT_PUBLIC_)/i.test(key)
  ));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command = "dev", ...args] = process.argv.slice(2);
  const explicitMode = ["demo", "standard"].includes(args[0]) ? args.shift() : undefined;
  try {
    if (!["dev", "build", "start"].includes(command)) throw new Error("Comando inválido.");
    const mode = resolveAppMode(explicitMode ? { APP_MODE: explicitMode } : process.env);
    const demo = mode === "demo";
    const directory = demo ? resolve(root, "apps/demo") : root;
    const executable = resolve(directory, demo ? "node_modules/vite/bin/vite.js" : "node_modules/next/dist/bin/next");
    if (!existsSync(executable)) throw new Error(demo ? "Instalá la demo con npm run demo:install." : "Instalá las dependencias con npm ci.");
    const environment = demo ? demoEnvironment(process.env) : process.env;
    console.log(`FIUBA Plan · ${demo ? "demo local, sin servicios externos" : "standard, acceso con contraseña"}`);
    const run = (file, parameters) => new Promise((done) => {
      const child = spawn(process.execPath, [file, ...parameters], { cwd: directory, env: environment, stdio: "inherit", windowsHide: true });
      child.on("error", (error) => { console.error(error.message); done(1); });
      child.on("exit", (code) => done(code ?? 1));
    });
    if (!demo && command === "dev") await run(resolve(root, "scripts/clean-next-webpack-cache.mjs"), []);
    const parameters = demo
      ? command === "dev" ? ["--host", "127.0.0.1", ...args]
        : command === "start" ? ["preview", "--host", "127.0.0.1", ...args] : ["build", ...args]
      : [command, ...args];
    let code = await run(executable, parameters);
    if (demo && command === "build" && code === 0) code = await run(resolve(directory, "scripts/finalize.mjs"), []);
    process.exitCode = code;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
