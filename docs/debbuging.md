<div align="center">

<img src=/assets/chess-crash.webp width="128"></img>

<h3>Debbuging Stockfish-18 WebAssembly</h3>

<p>Summary of incorrect compilation options and errors due to the nature of C++ for WebAssembly</p>

</div>


#### wasm-ld: error: unable to find library -lgcov

Emscripten uses Clang as its underlying C and C++ compiler. -lgcov is not supported by clang/llvm for code coverage.<br>
Replace -lgcov with --coverage flag.


#### Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)

Change the value of MAXIMUM_MEMORY to 4GB <br>
We need to find another solution to allow us to use for example a stack of 2GB.


#### Memory access out of bounds

Stockfish iterates through a decision tree in a while loop. We don't want to run it as is in a browser. Javascript been single threaded will hang indefinitely waiting for the loop to finish and you'll get a notification about a "RuntimeError: memory access out of bounds" error.

For this reason we move the loop logic in main() into a `wasm_uci_execute()` function that represents one iteration of the loop. This way JS runs that iteration and yields the processor back so doesn't appear blocked.

* I don't know if this is the problem and the solution.


#### Memory access out of bounds

Compiling with the option `debug=yes` the error points to:
    bitboard.cpp:146:29  --> reference[size] = Bitboards::sliding_attack(pt, s, b);
    bitboard.cpp:79  --> init_magics(ROOK, RookTable, Magics);

Compiling with the option `-fsanitize=undefined,address` the browser reports: `AddressSanitizer: out of memory: allocator is trying to allocate 0xa0100000 bytes` (This is 2685403136 bytes or 2,5 GB).

Default STACK_SIZE for Emscripten is 64 KBytes (65536 bytes).

Firefox attempts to execute sf18.js:92 and the following sequence of function calls occurs until the error is reached:
    ../src/engine.cpp:71:9
    ../src/uci.cpp:68:5
    ../src/main.cpp:49:51

sf18.js:92 is the line who call `Module["read_stdout"] = Module["read_stdout"] || (output => console.log(output));`

Unable to find a solution to this problem I will use Emscripten Tracing tools for debugging.<br>
We going to use Google Web Tracing Framwork for Chrome.
 

Other tracing option could be:
```sh
git clone https://github.com/waywardmonkeys/emscripten-trace-collector
sudo apt update
sudo apt install python2.7
sudo apt-get install python-pip
cd emscripten-trace-collector
python2.7 -m pip install -r requirements.txt
python2.7 run-server.py

```

Navigate to http://localhost:5000 <br>
But this option is not very well manteined.


#### Emscripten Tracing

Set the `--tracing` option at the command line. It communicates results to an external data collection server. <br>

Features: 
  * Track custom contexts
  * Allocation annotations to track mallocs
  * Logging messages
  * Tasks reporting
  * Event loop reporting
  * Google web tracing framework inter-operability

```C++
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>   // To export functions, values and objects.
#include <emscripten/fetch.h>  // Allows native code to transfer files
#include <emscripten/trace.h>
```

Configure the trace system into the C++ main loop `emscripten_trace_configure("http://127.0.0.1:5000", "STFISH")`. 

Annotate some memory types to label some memory allocations to strings. Thus, you can pick them out in the UI later `emscripten_trace_annotate_address_type(font, "TTY_FONT")`.

Record start and end loop events. Inside any function loop place: 
```C++
emscripten_trace_record_frame_start();
emscripten_trace_record_frame_end();
```

Set contexts to track execute position or segment the program:
```C++
emscripten_trace_enter_context("Initializing Bitboard");
emscripten_trace_exit_context();
``` 

Report memory layout and heap data periodically:
```C++
if(frames % 60 == 0) {
    emscripten_trace_report_memory_layout();
    emscripten_trace_report_off_heap_data();
}
```

#### Stockfish Manual Trace

```C++
// main.cpp --> 
std::cout << engine_info() // call to misc.cpp
// wasm_uci_execute -->
Bitboards.init();  // call to init_magics for ROOK & BISHOP



```







#### nnue/layers/../simd.h:49:20: error: unknown type name '__m512i' Error

WebAssembly does not support 512 bytes operations.<br>
Read [Using SIMD with WebAssembly](https://emscripten.org/docs/porting/simd.html)<br>
Compile adding -msimd128 for WebAssembly


#### em++: warning: export name is not a valid JS symbol - Use `Module` or `wasmExports` to access this symbol [-Wjs-compiler]

```sh
em++ --clear-cache
```