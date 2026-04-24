<div align="center">

<img src=/assets/stockfish_128x128.png></img>

<h3>Stockfish Wasm</h3>

<p>Stockfish is a free and powerful UCI chess engine. It analyzes chess positions and calculates optimal moves. <br>
Here we complile it for WebAssembly</p>

</div>


### Usage

```sh
# Into the root directory
emrun sf.html --no_emrun_detect
```

emrun is an Emscripten local web server and test tool.

Enter some UCI commands.


#### UCI - Universal Chess Interface

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

Stockfish is written in C++ to maximize speed execution. The code has been optimized for certain HW architectures but compilation for web browsers has not been taken into account. We modify some files to achieve this objetive.

Added or modified files:
```sh
src/Makefile
src/main.cpp
src/misc.cpp
src/emscripten  # directory
```

In "src/Makefile" we consider a new architecture and compiler: "wasm" and "emscripten".


#### Prerequisites

To compile sf18-wasm by yourself follow this steps.

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


#### Debbuging 

When trying to compile our own version of Stockfish WebAssembly we face many errors which we summarize [here](/docs/debbuging.md).


#### Test C++ Stockfish through the console

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

#### References

To understand Stockfish: <br>
[Bitboards](/docs/bitboards.md)


### Acknowledgements

Thanks to the [Stockfish](https://github.com/official-stockfish/Stockfish) team and all its contributors.

Some WebAssembly compilation ideas are based on [Hiroshi Ogawa](https://github.com/hi-ogawa/Stockfish) work and the wasm branch of [Pikafish](https://github.com/official-pikafish/Pikafish)

