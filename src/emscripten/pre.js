/*
if (!Module["preRun"]) Module["preRun"] = [];

Module["preRun"].push(function () { 
    let wasm_uci_execute = Module.cwrap("wasm_uci_execute", "void", []);
    Module.uci = Module.cwrap("uci_step", 'void', ['number', 'str']);
    Module.add = Module.cwrap('call_add', 'number', ['number']);
});
*/


Module["terminate"] = () => { PThread.terminateAllThreads(); };
