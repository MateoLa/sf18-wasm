<div align="center">

<img src=/assets/chess-crash.webp width="128"></img>

<h3>Debbuging Stockfish-18 WebAssembly</h3>

<p>Summary of incorrect compilation options and errors due to the nature of C++ for WebAssembly</p>

</div>


### Compiling errors

#### wasm-ld: error: unable to find library -lgcov

Emscripten uses Clang as its underlying C and C++ compiler. -lgcov is not supported by clang/llvm for code coverage.<br>
Replace -lgcov with --coverage flag.


#### Memory access out of bounds

Compiling with the option `debug=yes` the error points to:
    <p color="red">bitboard.cpp:146:29  --> reference[size] = Bitboards::sliding_attack(pt, s, b);</p>
    bitboard.cpp:79  --> init_magics(ROOK, RookTable, Magics);

Compiling with the option `-fsanitize=undefined,address` the browser reports: `AddressSanitizer: out of memory: allocator is trying to allocate 0xa0100000 bytes` (This is 2685403136 bytes or 2,5 GB).


#### Memory access out of bounds Manual Trace

```C++
main.cpp: 
std::cout << engine_info()  -->  misc.cpp  --> console.log "To WebAssembly by MaLa"
wasm_uci_execute  -->  Bitboards.init();  --> console.log "Hello Numb: After Square Distance"
Bitboards.init()  --> init_magics(ROOK, RookTable, Magics)
```

In bitboard.cpp: <br>
Adding many lines of code like: <br>
`std::cout << "MaLa debugging: Sliding Attacks \n" + Bitboards::pretty(reference[size]) << std::endl;` <br>
I reached a point at the `do{...}while (b);` loop, when `size==236`, at which stockfish and the browser crashed. 

Chrome reports:
```sh
To WebAssembly by MaLa
MaLa debugging: After Square Distance
MaLa debugging: Into magics, PieceType ...4: Rook
Aborted(Stack overflow! Stack cookie has been overwritten at 0x12a87e40, expected hex dwords 0x89BACDFE and 0x2135467, but received 0x40808080 0x00000000)
```

The error does not occurs due to any specific instruction, so I think it's a Busy waiting issue.

The following reinforces this idea. <br>
bitboard.cpp, inside the loop and around line 172:
```C++
if (size==230) b = 0; // MaLa Debbugging: If I do that the program runs.
```

WASM operates in a memory-safe sandboxed environment. Allocate memory from the WASM heap or linear memory space to ensure compatibility.

Also, the emrun server reports:
`[ERROR:base/memory/shared_memory_switch.cc:289] Failed global descriptor lookup: 7` <br>
It indicates a regression in the browser's sandbox brokering, where the browser fails to correctly map shared memory segments into its secure sandbox.

Potential Cause: <br>
Stale Shared Memory: un-detached memory segments can cause lookup failures.

Google: <br>
WebAssembly memory segments ramain un-detached from JavaScript when using SharedArrayBuffer or with resizable ArrayBuffers via toResizableBuffer().<br>
Traditionally, Wasm memory growth detaches existing ArrayBuffer views in JS, invalidating them. The toResizableBuffer() method prevents this detachment. <br>
When WebAssembly.Memory is initialized with a SharedArrayBuffer, the memory is shared between JavaScript and Wasm threads and it does not detach upon growth.

Debuggin with SAFE_HEAP instead of ASan (Address Sanitizer) I get the error: <br>
`Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)`

* Error Summary:
I added the line `LDFLAGS += -s STACK_SIZE=128KB` and the error was resolved.


#### Thread Constructor Failed

The error reported by the browser is: <br>
`system_error was thrown in -fno-exceptions mode with error 138 and message "thread constructor failed"`

The error stack at the console shows:
```sh
$func919	@	system_error.cpp:364
$func1121	@	thread.h:217
$func1401	@	thread.cpp:240          =>      create_thread();
$func907	@	engine.cpp:151          =>      resize_threads();
$func906	@	uci.cpp:68              =>      engine(argv[0]),
$__main_argc_argv	@	main.cpp:46
```


#### Implicitly binding raw pointers is illegal
#### Unbound Type Error

Embind does not automatically map C-style character pointers (`char*`) to Javascript strings.

Use std::string in your C++ function signature instead of char*.<br>
According to the C++ standard, the main function must be defined as either char** argv or `char* argv[]` in its second parameter.<br>
In this case you can explicitly allow raw pointers: <br>
`emscripten::function("wasm_uci_execute", &wasm_uci_execute, emscripten::allow_raw_pointers());`

If you are not using `EMSCRIPTEN_BINDINGS` and prefer char*, use `Module.cwrap` to define the mapping.<br>
const uci = Module.cwrap("wasm_uci_execute", "void", []);


#### nnue/layers/../simd.h:49:20: error: unknown type name '__m512i' Error

WebAssembly does not support 512 bytes operations.<br>
Read [Using SIMD with WebAssembly](https://emscripten.org/docs/porting/simd.html)<br>
Compile adding -msimd128 for WebAssembly


#### em++: warning: export name is not a valid JS symbol - Use `Module` or `wasmExports` to access this symbol [-Wjs-compiler]

```sh
em++ --clear-cache
```

#### make: file not recognized: file format not recognized
#### wasm-ld: error: unknown file type: ...

`make clean`


#### Segmentation Fault (core dumped)

auto uci = std::make_unique<UCIEngine>(0, nullptr);
Stockfish cannot been initialized with arguments (argc, argv) = (0, nullptr).


#### Threads error
&
#### Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread

This error is thrown because the Blocking the main browser thread is blocked, but where is the problem?

Like Stockfish stands, Threads constructor launches the thread and waits until it goes to sleep in idle_loop().

When running Stockfish over WebAssembly, the main browser thrread cannot be blocked. If the main thread calls cv.wait() or locks a mutex that a worker thread needs, emscripten stalls.

When a worker thread calls notify_one(), it might require a message event loop turn to propagate the signal across the SharedArrayBuffer barrier via the browsers's web workers. If the main thread is frozen waiting, it can never process the incoming notification.

The Problem:

Classes declared in EMSCRIPTEN_BINDINGS initialize automatically when the WebAssembly module loads. This relies on C++ static iitialization. Under the hood, Emscripten hooks this process so exported classes are exposed immediately upon the onRuntimeInitialized JS lifecycle event. <br>
But, what's happens? <br>
Well, the Module and the class are initialized together, but threads synchronizations fails because main() exits before synchronizations ends.

Solution: <br>

Add `emscripten_runtime_keepalive_push();` into main().


#### uci command GO - Aborted(alignment fault)

In uci.cpp, when token = GO, the application must print `print_info_string(engine.numa_config_information_as_string());` <br>
"numa_config_information_as_string()" execute `get_numa_config_as_string()` at engine.cpp which in turn calls `get_numa_config().to_string()` from a numa Context.
In numa.h, the function `to_string()` try to loop between nodes in: `for (auto&& cpus : nodes)` and it fails because nodes is empty.

Why nodes is empty? <br>
Stockfish stands: "It is guaranteed that NUMA nodes are NOT empty: every node exposed by NumaConfig has at least one processor assigned." <br>

nodes is empty because engine does not exists??



#### Browser - Program exited

The error reported by the browser is: <br>
`program exited (with status: 0), but keepRuntimeAlive() is set (counter=0) due to an async operation, so halting execution`

This information log from Emscripten indicates that your C/C++ main() function has finished execution, but the JS/WebAssembly module ramains active allowing asynchronous tasks to complete.

All this error messages can occurs when JS triggers a compiled wasm function after the runtime has already shut down or crashed:
* Aborted(segmentation fault)
* user callback triggered after runtime exited or application aborted.  Ignoring.
* Uncaught (in promise) RuntimeError: Aborted(segmentation fault)

Lesson: You can call other C/C++ functions after main() has finished, but you must prevent Emscripten from autimatically shutting down the WebAssembly runtime. By default, when main() exits, Emscripten terminates the entire application runtime and cleans up memory. Add the `-s NO_EXIT_RUNTIME=1` flag.

Lesson: To export the function use `EMSCRIPTEN_KEEPALIVE` or `-s EXPORTED_FUNCTIONS="['_function_name']"`


#### Browser - Blocking on the main thread is very dangerous

To use pthreads ("multithread" option in Makefile) you should work over workers and do not build your module into the main thread. To build the module in the main thread set multithread=no in emscripten/Makefile.


#### Module["stdin"] override

Overriding Fs.stdin by:
```js
var stdinBuff = 'Hello\nworld!\n'.split('').map(c => c.charCodeAt(0));
var Module["stdin"] = function() { stdinBuff.shift() || null };
```

You should see the SF output `Unknown command: 'Hello'. Type help for more information`, which means that the program is receiving the string "Hello" as initial input.


### References

[Memory Management](https://deepwiki.com/emscripten-core/emscripten/4.2-memory-management)


### Notes

##### Lesson 1 - How to Disable Automatic main() Execution

By default, Emscripten compiled applications automatically execute the main() function after the WebAssembly module loads.

Compile with the flag `-s INVOKE_RUN=0` or set `Module['noInitialRun'] = 0` in JavaScript. Both methods allow you to use Module.callMain() later.

You can also rename the main function to something else. You can do this directly in your code or by using `-Dmain=originalMain` preventing the linker from identifying the entry point.

At higher optimization levels (like -O2 or -O3), if _main is not exported and not called internally, the compiler may remove it to reduce file size.

##### Lesson 2

From types.h:
```C++
// clang-format off
enum PieceType : std::uint8_t {
    NO_PIECE_TYPE, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
    ALL_PIECES = 0,
    PIECE_TYPE_NB = 8
};
// clang-format on
```

In C++, an array declared within a `clang-format-off` block is accessed exactly like any other array. "clang-format" is a source code formatter, it only affects how your code looks on screen, not how it compiles or runs.


##### Lesson 3

Emscripten uses WebAssembly's linear memory model: a single contiguous arrayBuffer accessed from both WebAssembly and JavaScript. <br>
The wasmMemory object is a WebAssembly.Memory instance created during initialization. The updateMemoryViews() function creates typed array views over wasmMemory.buffer whenever memory allocated or grown.

```sh
# Address Space (0x0000)  =>  
    Region:                 Config:
Static Data             GLOBAL_BASE (default 1024)          (Global variables, constants, read-only data)
    |
Dynamic Heap            INITIAL_HEAP                        (malloc/new -> free allocations)
    |
Stack Region            STACK_SIZE (default 64KB)   =>      INITIAL_MEMORY (Top of initial memory)
```

* Memory Heap (Pila de memoria)

INITIAL_MEMORY sets the starting size of the memory. <br>
INITIAL_HEAP defines the specific amount of memory available for dynamic allocations (via malloc or new) independently of static data.

The heap is compatible with C/C++ alignment rules. Unaligned reads/writes may work but can be significantly slower. You can use -s SAFE_HEAP=1 during debugging to catch alignment or out-of-bounds issues. Emscripten ASan (Address Sanitizer) does not work with SAFE_HEAP.


##### Lesson 4 - getline(std::cin, x)

It means the function successfully read an entire line of text from the input stream. An empty line or if the user presses `Enter` is still sucessfully and stores an empty string "" in x. <br>
This is the way 


`!getline(std::cin, x)` is the standard way to check if a stream read operation has failed or reached the EOF. 

Emscripten stdin often fail after the first prompt because of the browser asynchronous nature. Unlike a desktop terminal that halt execution waiting for input, the JS engine returns inmediately or forces a program exit.


##### Lesson 5

Emscripten standard I/O works by going through the virtual /dev/stdin, /dev/stdout and /dev/stderr devices. You can set them up using your own I/O functions by calling FS.init(stdin, stdout, stderr).

All the configuration should be done before the main run() method is executed, typically by implementing Module.preRun.

Another way to override FS.stdin is by using Module["stdin"]. "stdin" quotation marks are mandatory. You should also clear C++ and C stream flags with `std::cin.clear()` and `std::clearerr(stdin)` after eof().

