import xx from "./sf18.js"

let Module = {
    printErr: (text) => { console.warn('MaLa C++ error: ', text); },
    print: (text) => { self.postMessage(text) },
    onRuntimeInitialized: () => {
        console.log("sf Module Loaded");
        Module.wasm_uci = Module.cwrap('wasm_uci', null, ['string']);
    }
}

const sf = await xx(Module);

self.onmessage = (e) => {
    console.log("MaLa WORKER - cmd: ", e.data);
    sf.wasm_uci(e.data);
}
