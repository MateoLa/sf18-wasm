import xx from "./sf18.js"

let memory = new WebAssembly.Memory({ 
    initial: 2048,       // In pages (1 page = 64KB). 2048 = 128MB 
    maximum: 32768,      // 2GB -> 2*(1024*1024*1024)/(64*1024) 
    shared: true
});

let Module = {
    wasmMemory: memory,
    print: (text) => { self.postMessage(text) },
    printErr: (err) => { console.warn("MaLa C++ error: ", err); },
    onRuntimeInitialized: () => { 
        console.log('Module loaded: ', Module);
        Module.wasm_uci = Module.cwrap('wasm_uci', null, ['string']);
    },
};

const sf = await xx(Module);

self.onmessage = (e) => {
    console.log("MaLa WORKER - cmd: ", e.data);
    sf.wasm_uci(e.data);
}
