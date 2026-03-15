<div align="center">

[<img src=https://stockfishchess.org/images/logo/icon_128x128.png></img>](https://stockfishchess.org)

<h3>Stockfish WebAssembly</h3>

<p>Stockfish is a free and powerful UCI chess engine</p> 
<p>It analyzes chess positions and calculates optimal moves</p>
<p>Here we complile it with Emscripten for WebAssembly</p>
</div>


#### Universal Chess Interface - UCI protocol

It is a command line protocol.

You will need to write to stdin ([UCI commands](https://backscattering.de/chess/uci/)) and listen to stdout.


#### WebAssembly 

Wasm is a binary instruction format for a stack-based virtual machine.

The code can be run in a modern browser to build a virtual machine which allows developers to run compiled codes (C++, Rust, etc.) on the client.

WebAssembly is designed to complement and run alongside JavaScript, sharing functionality between them.


#### Source Code Modification

Stockfish is written in C++ to maximize speed execution. It has been optimized for certain HW architectures but its compilation for web browsers has not been taken into account.

We modify some files to achieve this objetive.<br>

In "src/Makefile" we consider a new architecture and compiler values: wasm and emscripten. We also inclue "/emscripten/Makefile".

Added or modified files:
```sh
src/Makefile
src/misc.cpp
src/uci.cpp
src/emscripten # directory added
```

### Usage

Test SF18 WebAssembly Version

```sh
cd server
emrun sf.html --no_emrun_detect
```

emrun is a Emscripten local web server and test tool.


#### Prerequisites
To compile Stockfish by yourself

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


#### Build Stockfish

```sh
cd src
make ARCH=wasm build -j
```

Build options can be set in /src/emscripten/Makefile
If you use the "minify_js" option, the version is compiled with warnings.

If you whant to delete all your outputs:
```sh
make ARCH=wasm clean
```


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

### Usage

```js
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

var stockfish = new Worker(wasmSupported ? 'stockfish.wasm' : 'stockfish.js');

stockfish.addEventListener('message', function (e) {
  console.log(e.data);
});

stockfish.postMessage('uci');
```


### Common Errors

* RuntimeError: table index is out of bounds --> Some UCI command is wrong



#### Using the Compiled Engine

The compiled engine is designed to run within a Web Worker to prevent blocking the main browser thread. It communicates using the standard Universal Chess Interface (UCI) protocol via messages. 

Example of use in a web page (via Web Worker):

```js
// Create a new web worker instance using the compiled stockfish.js file
var stockfish = new Worker('stockfish-18-single.js');

// Send UCI commands to the engine
stockfish.postMessage('uci');
stockfish.postMessage('isready');
stockfish.postMessage('position startpos moves e2e4');
stockfish.postMessage('go depth 15');

// Listen for messages (output) from the engine
stockfish.onmessage = function(event) {
    console.log(event.data);
    if (event.data.startsWith('bestmove')) {
        // Handle the best move
        var bestMove = event.data.split(' ')[1];
        // ... update your chess board GUI here
    }
};
```


### Acknowledgements

Thanks to the [Stockfish](https://github.com/official-stockfish/Stockfish) team and all its contributors.

The WebAssembly compilation is based on [Hiroshi Ogawa](https://github.com/hi-ogawa/Stockfish) work and <br>
[Lichess](https://github.com/lichess-org/stockfish.js)

