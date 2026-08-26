
/*
When using pthreads (-pthread / -sUSE_PTHREADS=1), Emscripten ignores or overrides the wasmMemory option 
which you are trying to set manually.
You should do this throught compiling flags:
  -sINITIAL_MEMORY=64mb \
  -sALLOW_MEMORY_GROWTH=1 \
  -sMAXIMUM_MEMORY=512mb

// Provide a custom WebAssembly Memory object explicitly
Module['wasmMemory'] = new WebAssembly.Memory({
    initial: 2048,      // In pages (1 page = 64KB). 2048 = 128MB 
    maximum: 32768,     // 2GB -> 2*(1024*1024*1024)/(64*1024) 
    shared: true        // Set to true if utilizing pthreads/threads
});
*/


Module["terminate"] = () => { PThread.terminateAllThreads(); };

/*
Module['printErr'] = function(text) { console.warn('MaLa C++ error: ', text); };

Module['print'] = function(text) { postMessage(text); };

Module['onmessage'] = function(e) {
    console.log('MaLa Worker - cmd: ', e.data);
    Module.cwrap('wasm_uci', null, ['string'], [e.data]); // Module._my_c_function()
}
*/

/*
WebAssembly threads use the new Worker constructor to create new underlying threads.
Each thread loads a JavaScript glue, and then the main thread uses Worker#postMessage method 
to share the compiled WebAssembly.Module as well as a shared WebAssembly.Memory with those other threads. 
This establishes communication and allows all those threads to run the same WebAssembly code on the same 
shared memory without going through JavaScript again.

Do not manually intercept or call postMessage on Emscripten’s internal pthread Web Workers. 
Emscripten relies on its own communication protocol over postMessage to coordinate underlying Web Workers, 
manage shared memory (SharedArrayBuffer), and handle thread lifecycle syncs. 
Hijacking these channels directly will break the runtime or corrupt the application state.
*/
