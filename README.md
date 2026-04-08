<div align="center">

[<img src=https://stockfishchess.org/images/logo/icon_128x128.png></img>](/docs/stockfish.md)

<h3>WebAssembly Stockfish</h3>

<p> Stockfish is a free and powerful UCI chess engine. It analyzes chess positions and calculates optimal moves. <br>
Here we complile it for WebAssembly</p>

</div>


#### Universal Chess Interface - UCI protocol

Is a command line protocol. You will need to write UCI commands to stdin and listen to stdout. For example:


```sh
uci
isready
position startpos
position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
position fen 4r1k1/r1q2ppp/ppp2n2/4P3/5Rb1/1N1BQ3/PPP3PP/R5K1 w - - 1 17
# start the calculation
go depth 20  # by depth
go movetime 5000  # by time (calculate for 5 seconds)
quit
```


#### WebAssembly 

Wasm is a binary instruction format for a stack-based virtual machine. The code could be run in modern browsers to execute compiled code (C++, Rust, Go, etc.) over the virtual machine.

WebAssembly is designed to complement and run alongside JavaScript, sharing functionality between them.


#### Stockfish source code modifications

Stockfish is written in C++ to maximize speed execution. It has been optimized for certain HW architectures but its compilation for web browsers has not been taken into account.

We modify some files to achieve this objetive.<br>

In "src/Makefile" we consider a new architecture and compiler values: wasm and emscripten. We also inclue "/emscripten/Makefile".

Added or modified files:
```sh
src/Makefile
src/misc.cpp
src/main.cpp
src/emscripten # directory added
```

#### Prerequisites

Follow this steps to compile sf18-wasm by yourself or skip to [Usage](#Usage)

Install GCC/g++ compilers required to compile C/C++ programs in Linux

```sh
sudo apt install build-essential
```

Install or Update Emscripten

```sh
git clone https://github.com/emscripten-core/emsdk.git  # download Emscripten if you haven't already

cd emsdk
./emsdk update  # update Emscripten is you already have it installed
./emsdk install latest
./emsdk activate latest  # set configuration files
source ./emsdk_env.sh  # set Emscripten into your current console

emcc -v
emcc --version
```


#### Build sf18-wasm

Build options can be set in /src/emscripten/Makefile
If you use the "minify_js" option, the version is compiled with warnings.

```sh
cd src
make ARCH=wasm build -j
```

Download the Neural Network. This command prepares the network to be embedded in the binary.
```sh
make net
```

If you whant to delete all your outputs:
```sh
make ARCH=wasm clean
```


### Try sf18-wasm

```sh
cd server
emrun sf.html --no_emrun_detect
```

emrun is an Emscripten local web server and test tool.

Enter some UCI commands.


#### Highlights

* Memory out of bounds

Stockfish iterates through a decision tree in a while loop. We don't want to run it as is in a browser. Javascript been single threaded will hang indefinitely waiting for the loop to finish and you'll get a notification about a "RuntimeError: memory access out of bounds" error.

For this reason we move the loop logic in main() into a `wasm_uci_execute()` function that represents one iteration of the loop. This way JS runs that iteration and yields the processor back so doesn't appear blocked. 

* Whick Kernel I'm runing

```sh
$ uname -r
6.8.0-106-generic

$ uname -a
Linux mateo-Crosshair 6.8.0-106-generic #106~22.04.1-Ubuntu SMP PREEMPT_DYNAMIC Fri Mar  6 08:44:59 UTC  x86_64 x86_64 x86_64 GNU/Linux
```

* Which compiler

```sh
$ gcc --version
gcc (Ubuntu 9.5.0-1ubuntu1~22.04.1) 9.5.0
Copyright (C) 2019 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```


### Common Errors

* Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)

Change the value of MAXIMUM_MEMORY to 4GB

* Memory access out of bounds

Compiling with the option `debug=yes` the error points to:
    bitboard.cpp:146:29  --> reference[size] = Bitboards::sliding_attack(pt, s, b);
    bitboard.cpp:79  --> init_magics(ROOK, RookTable, Magics);

Compiling with the option `-fsanitize=undefined,address` the browser reports: `AddressSanitizer: out of memory: allocator is trying to allocate 0xa0100000 bytes` (This is 2685403136 bytes or 2,5 GB).

Default STACK_SIZE for Emscripten is 64 KBytes (65536 bytes).


* nnue/layers/../simd.h:49:20: error: unknown type name '__m512i' Error

WebAssembly does not support 512 bytes operations.<br>
Read [Using SIMD with WebAssembly](https://emscripten.org/docs/porting/simd.html)<br>
Compile adding -msimd128 for WebAssembly

* wasm-ld: error: unable to find library -lgcov

Emscripten uses Clang as its underlying C and C++ compiler. -lgcov is not supported by clang/llvm for code coverage.<br>
Replace -lgcov with --coverage flag.


#### Test Stockfish through the console

Download a compiled [relese of stockfish]('https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-ubuntu-x86-64-vnni512.tar') for a specific architecture.

Or compile stockfish by yourself `make build ARCH=x86-64-avx2 > build.log 2>&1` generating the executable file. Choose the right ARCH.

Execute Stockfich `./stockfish-ubuntu-x86-64-vnni512`

Stockfish UCI commands:

```sh
./stockfish  # execute stockfish
uci
isready
setoption name UCI_AnalyseMode value true
setoption name Analysis Contempt value Off
setoption name Threads value 32
setoption name Hash value 1024
position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
position fen 4r1k1/r1q2ppp/ppp2n2/4P3/5Rb1/1N1BQ3/PPP3PP/R5K1 w - - 1 17
# start the calculation
go depth 20  # by depth
go movetime 5000  # by time (calculate for 5 seconds)
quit
```


### Acknowledgements

Thanks to the [Stockfish](https://github.com/official-stockfish/Stockfish) team and all its contributors.

Some WebAssembly compilation ideas are based on [Hiroshi Ogawa](https://github.com/hi-ogawa/Stockfish) work and the wasm branch of [Pikafish](https://github.com/official-pikafish/Pikafish)

