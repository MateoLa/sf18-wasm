<div align="center">

[<img src=https://stockfishchess.org/images/logo/icon_128x128.png></img>](https://stockfishchess.org)

<h3>Stockfish</h3>

<p>A free and strong UCI chess engine.</p>
<p>Analyzes chess positions and computes optimal moves.</p>
</div>

#### Universal Chess Interface - UCI protocol

It is a command line protocol.

You will need to write to stdin ([UCI commands](https://backscattering.de/chess/uci/)) and listen to stdout.

Compiling stockfish generates a binary file `make build ARCH=x86-64-avx2 > build.log 2>&1`


#### WebAssembly 

Wasm is a binary instruction format for a stack-based virtual machine.

The code can be run in a modern browser to build a virtual machine which allows developers to run compiled codes (C++, Rust, etc.) on the client.

WebAssembly is designed to complement and run alongside JavaScript, sharing functionality between them.


### Prerequisites

* Install Node

* Install Emscripten

* Set working directory to stockfish/src/

* Build  

```sh
cd src
make ARCH=wasm build -j`
```

Build options can be set in /src/emscripten/Makefile
If you use the "minify_js" option, the version is compiled with warnings.


### Run the test Server

```js
cd server
npm install
node app.js
```

WebAssembly requires these HTTP headers on the top level response:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```


### Example of Stockfish UCI commands

To send throught the UCI form:

```sh
uci
setoption name UCI_AnalyseMode value true
setoption name Analysis Contempt value Off
setoption name Threads value 32
setoption name Hash value 1024
position fen 4r1k1/r1q2ppp/ppp2n2/4P3/5Rb1/1N1BQ3/PPP3PP/R5K1 w - - 1 17
go depth ' + nr
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

#### Added and Modified Files:

```sh
src/Makefile
src/misc.cpp
src/emscripten directory added
/server directory added
```

### Acknowledgements

Thanks to the [Stockfish](https://github.com/official-stockfish/Stockfish) team and all its contributors.

The WebAssembly compilation is based on [Hiroshi Ogawa](https://github.com/hi-ogawa/Stockfish) and <br>
[Lichess](https://github.com/lichess-org/stockfish.js)

