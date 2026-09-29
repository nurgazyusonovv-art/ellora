// Python кодун браузерде (Pyodide) иштеткен worker. Негизги баракчаны тоңдурбаш үчүн өзүнчө жүрөт.
import { loadPyodide } from "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/pyodide.mjs";

const ready = loadPyodide({ indexURL: "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/" });

// Сурамдар кезек менен аткарылат: бир эле учурда эки программа иштесе, чыгыштары аралашып кетет.
let queue = Promise.resolve();
self.onmessage = (e) => {
  queue = queue.then(() => run(e.data)).catch(() => {});
};

async function run({ id, code, stdin }) {
  const py = await ready;
  let out = "";
  const dec = new TextDecoder();
  // Буферсиз жазуу: ар бир иштетүүнүн чыгышы өзүнчө калат.
  const sink = {
    write: (buf) => {
      out += dec.decode(buf, { stream: true });
      return buf.length;
    },
  };
  const lines = String(stdin ?? "").split("\n");
  py.setStdout(sink);
  py.setStderr(sink);
  py.setStdin({ stdin: () => (lines.length ? lines.shift() : undefined) });
  try {
    await py.runPythonAsync(code, { globals: py.toPy({}) });
    self.postMessage({ id, output: out.replace(/\n$/, "") });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err).trim().split("\n");
    self.postMessage({ id, output: out.replace(/\n$/, ""), error: msg[msg.length - 1] });
  }
}

self.postMessage({ id: "boot" });
