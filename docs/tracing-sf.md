### Threads

C++ threads map directly to kernel-level threads on almost all modern operating systems.

In a default Emscripten build, the main application thread is exactly the same as the borwser's main UI thread. This behavior changes if you compile your code using specific multithreading flags. <br>
If you complile your project with the Emscripten linker flag `-sPROXY_TO_PTHREAD` your C++ main() function is no longer run on the browser's main UI thread. Emscripten automatically spawns a separate Web Worker behind the scenes.

When using multithreading (-pthread) you can verify which thread you are currently executing on: <br>
  * emscripten_is_main_browser_thread() - returns true if the code is executing on the browser's main UI thread <br>
  * emscripten_is_main_runtime_thread() - returns true if the code is executing on the thread executing main()

When the main() function exits in a multithreaded Emscripten application, by default, if EXIT_RUNTIME=1, completing main() will shut down the entire WebAssembly runtime (aggressively terminating all active background pthreads). If you want your background threads to continue running after main() completes, you must explicitly instruct Emscripten to keep the runtime alive compiling with `sEXIT_RUNTIME=0`.

When using Emscripten's `-s MODULARIZE=1` the generated factory function does not execute main() automatically. 

`-s PROXY_TO_PTHREAD` Emscripten spawns a background Web Worker immediately upon application startup. Your actual C/C++ main() is executed inside that background Web Worker. Because main() is off the UI thread, you can safely call pthread_create() without freezing the browser tab.

To suppport Pthreads browsers must enabled SharedArrayBuffer (html COOP and COEP headers must be defined) to allow sharing memory between the main thread and web workers (as well as atomic operations for synchronization which enables support for the Pthreads API).

`-s PTHREAD_POOL_SIZE=<nr>` specifyies a predefined pool of web workers created at preRun time before main() is called. `navigator.hardwareConcurrency` is the number of CPU cores.

Operations, like interacting with the DOM, called from a background thread, must be proxied to the main browser thread. JS functions can be marked as `__proxy: 'sync'` (or async) returning a promise. The calling thread will block until the operation on the main thread is completed (the returned promise is resolved).

In most cases the "main browser thread" is the same as the "main application thread". The later is the one on which you started up the application (by loading the main JS file emitted by Emscripten). However, you can also start a multithreaded application in a worker, in that case the main application thread is that worker. 

Using "PROXY_TO_PTHREAD" may take some porting work, if the application assumed main() was on the main browser thread (replacing blocking calls with nonblocking ones is too much difficult).


#### Threads example

```C++
#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>

std::mutex mtx;
std::condition_variable cv;
bool ready = false; // The shared state variable

void worker_thread() {
    std::unique_lock<std::mutex> lock(mtx);
    
    // This blocks if ready is false. 
    // It returns ONLY when 'ready == true' AND the lock is re-acquired.
    cv.wait(lock, []{ return ready; });
    
    std::cout << "Condition is true, processing data...\n";
}

void publisher_thread() {
    {
        std::lock_guard<std::mutex> lock(mtx);
        ready = true; // Set the condition to true
    }
    cv.notify_one(); // Wake up the waiting thread
}

int main() {
    std::thread worker(worker_thread);
    std::thread publisher(publisher_thread);
    worker.join();
    publisher.join();
    return 0;
}
```


### Stockfish 18 Threads

Stockfish 18 runs in a multithread environment. <br>
By default it runs in one thread and you can optionally config more by the setoption uci command.

```sh
./stockfish 
setoption name Treads value 4
```


#### Threads idle_loop()

Like Stockfish stands, Constructor launches the thread and waits until it goes to sleep in idle_loop().

```C++
Thread::Thread(Search::SharedState&                    sharedState,
               std::unique_ptr<Search::ISearchManager> sm,
               size_t                                  n,
               size_t                                  numaN,
               size_t                                  totalNumaCount,
               OptionalThreadToNumaNodeBinder          binder) :
    idx(n),
    idxInNuma(numaN),
    totalNuma(totalNumaCount),
    nthreads(sharedState.options["Threads"]),
    stdThread(&Thread::idle_loop, this)    // --> idle_loop is called here.
```

Thus, any new thread is automatically parked in idle_loop() by a startup routine right after the thread launches and until work is assigned.




#### sf18-trace C++ ./stockfish debugging

We can compile Stockfish Trace to run in the console and compare its output with that of the browser.

```sh
make clean
make build ARCH=x86-64-avx2
```

> ./stockfish
Stockfish 18 by the Stockfish developers (see AUTHORS file)
To WebAssembly by MaLa

MaLa debugging: After Square Distance
MaLa debugging: Into magics, PieceType: Rook
MaLa debugging: Out of magics
MaLa debugging: Sparcing Init Magic Calls
MaLa debugging: Into magics, PieceType: Bishop
MaLa debugging: Out of magics
MaLa debug: Init done
MaLa: workingDirectory - /home/mateo/Desktop/wasm/sf18-trace/src
MaLa: binaryDirectory - /home/mateo/Desktop/wasm/sf18-trace/src/
MaLa: Numa config from System - SystemThreadsNB - 16
MaLa: Numa config from System - SystemThreadsNB - 16
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: Into Numa config From System - TO STRING - 0-15
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: Into Numa config From System - TO STRING - 0-15
MaLa: Numa config from System - SystemThreadsNB - 16
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: Into Numa config From System - TO STRING - 0-15
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa debug: into Engine - PATH ./stockfish
MaLa: position rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
MaLa: network LOAD. EvalFilePath: nn-c288c895ea92.nnue
MaLa: network LOAD. RootDirectory: /home/mateo/Desktop/wasm/sf18-trace/src/
MaLa: network LOAD. EvalFileCurrent: None
MaLa: network LOAD. Directory: <internal>
MaLa: network LOAD INTERNAL: nn-c288c895ea92.nnue
MaLa: FileNameBig: nn-c288c895ea92.nnue
MaLa: FileNameSmall: nn-37f18f62d772.nnue
MaLa: EMBEDDED BIG - Size: 108919594
MaLa: EMBEDDED BIG - Data:  /�z�.�T
MaLa: EMBEDDED BIG - End: 
MaLa: LOAD Internal Description: Network trained with the https://github.com/official-stockfish/nnue-pytorch trainer.
MaLa: network LOAD. EvalFileCurrent: nn-c288c895ea92.nnue
MaLa: network LOAD. Directory: 
MaLa: network LOAD. EvalFileCurrent: nn-c288c895ea92.nnue
MaLa: network LOAD. Directory: /home/mateo/Desktop/wasm/sf18-trace/src/
MaLa: network LOAD. EvalFilePath: nn-37f18f62d772.nnue
MaLa: network LOAD. RootDirectory: /home/mateo/Desktop/wasm/sf18-trace/src/
MaLa: network LOAD. EvalFileCurrent: None
MaLa: network LOAD. Directory: <internal>
MaLa: network LOAD INTERNAL: nn-37f18f62d772.nnue
MaLa: FileNameBig: nn-c288c895ea92.nnue
MaLa: FileNameSmall: nn-37f18f62d772.nnue
MaLa: EMBEDDED SMALL - Size: 3519630
MaLa: EMBEDDED SMALL - Data:  /�z�<T
MaLa: EMBEDDED SMALL - End: 
MaLa: LOAD Internal Description: Network trained with the https://github.com/official-stockfish/nnue-pytorch trainer.
MaLa: network LOAD. EvalFileCurrent: nn-37f18f62d772.nnue
MaLa: network LOAD. Directory: 
MaLa: network LOAD. EvalFileCurrent: nn-37f18f62d772.nnue
MaLa: network LOAD. Directory: /home/mateo/Desktop/wasm/sf18-trace/src/
MaLa: Numa config from System - SystemThreadsNB - 16
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: Into Numa config From System - TO STRING - 0-15
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: into Engine. Loading_Networks.
MaLa debugging: resizing threads
MaLa debugging: requested - 1
MaLa threads Set - size: 0
MaLa threads Set - manager: 0x5bf86c415040
MaLa threads Set - thread Id: 0
MaLa threads Set - Numas: 0
MaLa new THREAD
(Parked in idle_loop by a startup routine right after the thread launches and until work is assigned)
MaLa debug: numaN - 0
MaLa debug: Total Numa Count - 1
MaLa debug: exit state: 0
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: before job
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: NUMA job done
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa debug: threads RESIZED
MaLa debugging: Threads Resized
MaLa: Options 
option name Debug Log File type string default <empty>
option name NumaPolicy type string default auto
option name Threads type spin default 1 min 1 max 1024
option name Hash type spin default 16 min 1 max 33554432
option name Clear Hash type button
option name Ponder type check default false
option name MultiPV type spin default 1 min 1 max 256
option name Skill Level type spin default 20 min 0 max 20
option name Move Overhead type spin default 10 min 0 max 5000
option name nodestime type spin default 0 min 0 max 10000
option name UCI_Chess960 type check default false
option name UCI_LimitStrength type check default false
option name UCI_Elo type spin default 1320 min 1320 max 3190
option name UCI_ShowWDL type check default false
option name SyzygyPath type string default <empty>
option name SyzygyProbeDepth type spin default 1 min 1 max 100
option name Syzygy50MoveRule type check default true
option name SyzygyProbeLimit type spin default 7 min 0 max 7
option name EvalFile type string default nn-c288c895ea92.nnue
option name EvalFileSmall type string default nn-37f18f62d772.nnue
MaLa LOOP Command: 


#### sf18-trace C++ uci command GO
 
> isready
MaLa LOOP Command: isready
MaLa ONE STEP Command: isready
MaLa ONE STEP Token: isready
readyok

> go
go
MaLa LOOP Command: go
MaLa ONE STEP Command: go
MaLa ONE STEP Token: go
MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
MaLa: UCI. REPLICA: Available processors: 0-15
info string Available processors: 0-15
MaLa: Into the GO command
MaLa: UCI. REPLICA: Using 1 thread
info string Using 1 thread
MaLa: I'm GOing
MaLa ENGINE - VERIFY NETWORKS
Mala: NUMA CONFIG: MaLa: numa context config - TO STRING - nodes 1
MaLa: numa context config string - 0-15
0-15
MaLa: NETWORK VERIFY - evalfilePath: nn-c288c895ea92.nnue
MaLa: NETWORK VERIFY - evalfileCurrent: nn-c288c895ea92.nnue
MaLa NETWORK. Verifying - THE 2nd IF.
MaLa: UCI. REPLICA: NNUE evaluation using nn-c288c895ea92.nnue (125MiB, (102384, 1024, 15, 32, 1))
info string NNUE evaluation using nn-c288c895ea92.nnue (125MiB, (102384, 1024, 15, 32, 1))
MaLa: NETWORK VERIFY - evalfilePath: nn-37f18f62d772.nnue
MaLa: NETWORK VERIFY - evalfileCurrent: nn-37f18f62d772.nnue
MaLa NETWORK. Verifying - THE 2nd IF.
MaLa: UCI. REPLICA: NNUE evaluation using nn-37f18f62d772.nnue (6MiB, (22528, 128, 15, 32, 1))
info string NNUE evaluation using nn-37f18f62d772.nnue (6MiB, (22528, 128, 15, 32, 1))
MaLa ENGINE - Messages LOOP: Network replica 1: Shared memory.
MaLa: UCI. REPLICA: Network replica 1: Shared memory.
info string Network replica 1: Shared memory.
MaLa THREAD POOL - Start Thinking.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa THREAD POOL - Reaching HERE.
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa THREAD POOL - OR HERE.
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
info depth 1 seldepth 2 multipv 1 score cp -1 nodes 20 nps 20000 hashfull 0 tbhits 0 time 1 pv e2e4
info depth 2 seldepth 3 multipv 1 score cp 27 nodes 48 nps 48000 hashfull 0 tbhits 0 time 1 pv e2e4
info depth 3 seldepth 4 multipv 1 score cp 35 nodes 103 nps 103000 hashfull 0 tbhits 0 time 1 pv e2e4
info depth 4 seldepth 5 multipv 1 score cp 37 nodes 258 nps 258000 hashfull 0 tbhits 0 time 1 pv d2d4
info depth 5 seldepth 9 multipv 1 score cp 29 nodes 541 nps 541000 hashfull 0 tbhits 0 time 1 pv e2e4 c7c5
info depth 6 seldepth 12 multipv 1 score cp 35 nodes 900 nps 450000 hashfull 0 tbhits 0 time 2 pv e2e4 c7c5 g1f3 b8c6
info depth 7 seldepth 9 multipv 1 score cp 33 nodes 1546 nps 515333 hashfull 1 tbhits 0 time 3 pv e2e4 e7e5 g1f3 b8c6 b1c3 g8f6

> stop
MaLa LOOP Command: stop
MaLa ONE STEP Command: stop
MaLa ONE STEP Token: stop
info depth 30 seldepth 54 multipv 1 score cp 26 lowerbound nodes 7874101 nps 839187 hashfull 997 tbhits 0 time 9383 pv e2e4
bestmove e2e4 ponder e7e5
MaLa: IDLE LOOP.


#### sf18-trace C++ Config more threads

> isready
MaLa LOOP Command: isready
MaLa ONE STEP Command: isready
MaLa ONE STEP Token: isready
readyok


> setoption name Threads value 6
MaLa LOOP Command: setoption name Threads value 6
MaLa ONE STEP Command: setoption name Threads value 6
MaLa ONE STEP Token: setoption
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa debugging: resizing threads
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa debugging: requested - 6
MaLa threads Set - size: 0
MaLa threads Set - manager: 0x6113863f7040
MaLa threads Set - thread Id: 0
MaLa threads Set - Numas: 0
MaLa new THREAD
(Parked in idle_loop by a startup routine right after the thread launches and until work is assigned)
MaLa debug: numaN - 0
MaLa debug: Total Numa Count - 6
MaLa debug: exit state: 0
MaLa WAITING for SEARCH - Lock
MaLa: IDLE LOOP.MaLa: THREAD - Block until signal (searching is 0?) - 1

MaLa THREAD Ends Searching.
MaLa: before job
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: NUMA job done
MaLa WAITING for SEARCH - Lock
MaLa: IDLE LOOP - JOB RUNNING.MaLa: THREAD - Block until signal (searching is 0?) - 1

MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa threads Set - size: 1
MaLa threads Set - manager: 0x6113863f6bf0
MaLa threads Set - thread Id: 1
MaLa threads Set - Numas: 1
MaLa new THREAD
(Parked in idle_loop by a startup routine right after the thread launches and until work is assigned)
MaLa debug: numaN - 1
MaLa debug: Total Numa Count - 6
MaLa debug: exit state: 0
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: before job
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: NUMA job done
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa threads Set - size: 2
MaLa threads Set - manager: 0x6113863f8b50
MaLa threads Set - thread Id: 2
MaLa threads Set - Numas: 2
MaLa new THREAD
(Parked in idle_loop by a startup routine right after the thread launches and until work is assigned)
MaLa debug: numaN - 2
MaLa debug: Total Numa Count - 6
MaLa debug: exit state: 0
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: before job
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: NUMA job done
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa threads Set - size: 3
MaLa threads Set - manager: 0x6113863fff70
MaLa threads Set - thread Id: 3
MaLa threads Set - Numas: 3
MaLa new THREAD
(Parked in idle_loop by a startup routine right after the thread launches and until work is assigned)
MaLa debug: numaN - 3
MaLa debug: Total Numa Count - 6
MaLa debug: exit state: 0
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: before job
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: NUMA job done
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa threads Set - size: 4
MaLa threads Set - manager: 0x6113863f4830
MaLa threads Set - thread Id: 4
MaLa threads Set - Numas: 4
MaLa new THREAD
(Parked in idle_loop by a startup routine right after the thread launches and until work is assigned)
MaLa debug: numaN - 4
MaLa debug: Total Numa Count - 6
MaLa debug: exit state: 0
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: before job
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: NUMA job done
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa threads Set - size: 5
MaLa threads Set - manager: 0x6113863f4af0
MaLa threads Set - thread Id: 5
MaLa threads Set - Numas: 5
MaLa new THREAD
(Parked in idle_loop by a startup routine right after the thread launches and until work is assigned)
MaLa debug: numaN - 5
MaLa debug: Total Numa Count - 6
MaLa debug: exit state: 0
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: before job
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: NUMA job done
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP - JOB RUNNING.MaLa: IDLE LOOP - JOB RUNNING.

MaLa: IDLE LOOP - JOB RUNNING.MaLa: IDLE LOOP - JOB RUNNING.

MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa: THREAD - JOB Block until signal (searching is 0?) - 0
MaLa: THREAD - JOB Safely Loading.
MaLa: THREAD - JOB Awaikening To Run (searching is 0?) - 1
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP - JOB RUNNING.
MaLa: IDLE LOOP - JOB RUNNING.MaLa: IDLE LOOP - JOB RUNNING.

MaLa: IDLE LOOP - JOB RUNNING.MaLa: IDLE LOOP - JOB RUNNING.MaLa: IDLE LOOP - JOB RUNNING.


MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 1
MaLa: IDLE LOOP.
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa WAITING for SEARCH - Lock
MaLa: THREAD - Block until signal (searching is 0?) - 0
MaLa THREAD Ends Searching.
MaLa debug: threads RESIZED
MaLa: UCI. REPLICA: Using 6 threads
info string Using 6 threads


