/**
 * VTracer WASM Web Worker (standalone)
 *
 * Lives in public/ to avoid bundler complexity.
 * Loads the WASM module manually via fetch + WebAssembly.instantiate.
 *
 * This is a vanilla JS worker that mirrors the vtracer-wasm npm package's
 * init logic but with explicit WASM loading from /vtracer.wasm.
 */

/* global self */

// ---- WASM module state ----
let wasm = null;
let initPromise = null;

// ---- Reimplemented wasm-bindgen glue (from vtracer-wasm/vtracer.js) ----
let cachedUint8ArrayMemory0 = null;
let cachedDataViewMemory0 = null;
let WASM_VECTOR_LEN = 0;

function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

const cachedTextEncoder = new TextEncoder();
const cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();

const encodeString =
  typeof cachedTextEncoder.encodeInto === "function"
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
      }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return { read: arg.length, written: buf.length };
      };

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) arg = arg.slice(offset);
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function debugString(val) {
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) return `${val}`;
  if (type == "string") return `"${val}"`;
  if (type == "symbol") return val.description ? `Symbol(${val.description})` : "Symbol";
  if (type == "function") return val.name ? `Function(${val.name})` : "Function";
  if (Array.isArray(val)) return "[" + val.map(debugString).join(", ") + "]";
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className = builtInMatches && builtInMatches.length > 1 ? builtInMatches[1] : "";
  if (className == "Object") {
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  if (val instanceof Error) return `${val.name}: ${val.message}\n${val.stack}`;
  return className;
}

function getImports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbg_buffer_609cc3eee51ed158 = (a) => a.buffer;
  imports.wbg.__wbg_entries_3265d4158b33e5dc = (a) => Object.entries(a);
  imports.wbg.__wbg_error_524f506f44df1645 = (a) => console.error(a);
  imports.wbg.__wbg_get_b9b93047fe3cf45b = (a, b) => a[b >>> 0];
  imports.wbg.__wbg_getwithrefkey_1dc361bd10053bfe = (a, b) => a[b];
  imports.wbg.__wbg_instanceof_ArrayBuffer_e14585432e3737fc = (a) => {
    try {
      return a instanceof ArrayBuffer;
    } catch (_) {
      return false;
    }
  };
  imports.wbg.__wbg_instanceof_Uint8Array_17156bcf118086a9 = (a) => {
    try {
      return a instanceof Uint8Array;
    } catch (_) {
      return false;
    }
  };
  imports.wbg.__wbg_isSafeInteger_343e2beeeece1bb0 = (a) => Number.isSafeInteger(a);
  imports.wbg.__wbg_length_a446193dc22c12f8 = (a) => a.length;
  imports.wbg.__wbg_length_e2d2a49132c1b256 = (a) => a.length;
  imports.wbg.__wbg_new_a12002a7f91c75be = (a) => new Uint8Array(a);
  imports.wbg.__wbg_set_65595bdd868b3009 = (a, b, c) => a.set(b, c >>> 0);
  imports.wbg.__wbindgen_as_number = (a) => +a;
  imports.wbg.__wbindgen_bigint_from_u64 = (a) => BigInt.asUintN(64, a);
  imports.wbg.__wbindgen_bigint_get_as_i64 = (a, b) => {
    const v = b;
    const ret = typeof v === "bigint" ? v : undefined;
    getDataViewMemory0().setBigInt64(a + 8, isLikeNone(ret) ? BigInt(0) : ret, true);
    getDataViewMemory0().setInt32(a, !isLikeNone(ret), true);
  };
  imports.wbg.__wbindgen_boolean_get = (a) => {
    const v = a;
    return typeof v === "boolean" ? (v ? 1 : 0) : 2;
  };
  imports.wbg.__wbindgen_debug_string = (a, b) => {
    const ret = debugString(b);
    const ptr = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    getDataViewMemory0().setInt32(a + 4, WASM_VECTOR_LEN, true);
    getDataViewMemory0().setInt32(a, ptr, true);
  };
  imports.wbg.__wbindgen_error_new = (a, b) => new Error(getStringFromWasm0(a, b));
  imports.wbg.__wbindgen_in = (a, b) => a in b;
  imports.wbg.__wbindgen_init_externref_table = () => {
    const table = wasm.__wbindgen_export_2;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
  };
  imports.wbg.__wbindgen_is_bigint = (a) => typeof a === "bigint";
  imports.wbg.__wbindgen_is_object = (a) => {
    const val = a;
    return typeof val === "object" && val !== null;
  };
  imports.wbg.__wbindgen_is_string = (a) => typeof a === "string";
  imports.wbg.__wbindgen_is_undefined = (a) => a === undefined;
  imports.wbg.__wbindgen_jsval_eq = (a, b) => a === b;
  imports.wbg.__wbindgen_jsval_loose_eq = (a, b) => a == b;
  imports.wbg.__wbindgen_memory = () => wasm.memory;
  imports.wbg.__wbindgen_number_get = (a, b) => {
    const obj = b;
    const ret = typeof obj === "number" ? obj : undefined;
    getDataViewMemory0().setFloat64(a + 8, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(a, !isLikeNone(ret), true);
  };
  imports.wbg.__wbindgen_string_get = (a, b) => {
    const obj = b;
    const ret = typeof obj === "string" ? obj : undefined;
    const ptr = isLikeNone(ret)
      ? 0
      : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    getDataViewMemory0().setInt32(a + 4, WASM_VECTOR_LEN, true);
    getDataViewMemory0().setInt32(a, ptr, true);
  };
  imports.wbg.__wbindgen_string_new = (a, b) => getStringFromWasm0(a, b);
  imports.wbg.__wbindgen_throw = (a, b) => {
    throw new Error(getStringFromWasm0(a, b));
  };
  return imports;
}

/**
 * Call to_svg on the WASM module
 */
function toSvg(pixels, width, height, configJs) {
  let deferred0, deferred1;
  try {
    const ptr = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
    const len = WASM_VECTOR_LEN;
    const ret = wasm.to_svg(ptr, len, width, height, configJs);
    deferred0 = ret[0];
    deferred1 = ret[1];
    return getStringFromWasm0(ret[0], ret[1]);
  } finally {
    wasm.__wbindgen_free(deferred0, deferred1, 1);
  }
}

async function initWasm() {
  if (wasm) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const wasmResponse = await fetch("/vtracer.wasm");
      const wasmBytes = await wasmResponse.arrayBuffer();
      const imports = getImports();
      const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
      wasm = instance.exports;

      // Reset memory caches after instantiation
      cachedDataViewMemory0 = null;
      cachedUint8ArrayMemory0 = null;

      // Run WASM start function
      wasm.__wbindgen_start();
    } catch (err) {
      initPromise = null;
      throw new Error("Failed to load VTracer WASM: " + err.message);
    }
  })();

  return initPromise;
}

// ---- Worker message handler ----
self.addEventListener("message", async (event) => {
  const { id, type, payload } = event.data;

  if (type !== "vectorize") {
    self.postMessage({ id, type: "error", payload: { error: "Unknown request type: " + type } });
    return;
  }

  try {
    self.postMessage({ id, type: "progress", payload: { progress: 0.1 } });

    await initWasm();

    self.postMessage({ id, type: "progress", payload: { progress: 0.3 } });

    const pixels = new Uint8Array(payload.imageData);
    const config = {
      binary: payload.config.binary,
      mode: payload.config.mode === "pixel" ? "pixel" : payload.config.mode,
      hierarchical: payload.config.hierarchical,
      cornerThreshold: (payload.config.cornerThreshold * Math.PI) / 180,
      lengthThreshold: payload.config.lengthThreshold,
      maxIterations: payload.config.maxIterations,
      spliceThreshold: (payload.config.spliceThreshold * Math.PI) / 180,
      filterSpeckle: Math.max(0, payload.config.filterSpeckle),
      // CRITICAL: visioncortex asserts is_same_color_a < 8 (runner.rs:82)
      // This maps directly to colorPrecision. Must be 0-7.
      colorPrecision: Math.min(7, Math.max(0, payload.config.colorPrecision)),
      layerDifference: payload.config.layerDifference,
      pathPrecision: payload.config.pathPrecision,
    };

    const startTime = performance.now();
    const svg = toSvg(pixels, payload.width, payload.height, config);
    const timeMs = Math.round(performance.now() - startTime);

    self.postMessage({ id, type: "result", payload: { svg, timeMs } });
  } catch (err) {
    // After a WASM panic, the module is in a corrupted state.
    // Reset everything so the next call re-instantiates a fresh module.
    wasm = null;
    initPromise = null;
    cachedUint8ArrayMemory0 = null;
    cachedDataViewMemory0 = null;

    self.postMessage({
      id,
      type: "error",
      payload: { error: err instanceof Error ? err.message : String(err) },
    });
  }
});

// Signal ready
self.postMessage({ id: "__init__", type: "progress", payload: { progress: 0 } });
