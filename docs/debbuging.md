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

To debbug this error I goning to use Emscripten Tracing tools. <br>
To do this we can use Google Web Tracing Framwork or `git clone github.com/wayword`






#### nnue/layers/../simd.h:49:20: error: unknown type name '__m512i' Error

WebAssembly does not support 512 bytes operations.<br>
Read [Using SIMD with WebAssembly](https://emscripten.org/docs/porting/simd.html)<br>
Compile adding -msimd128 for WebAssembly


#### em++: warning: export name is not a valid JS symbol - Use `Module` or `wasmExports` to access this symbol [-Wjs-compiler]

```sh
em++ --clear-cache
```