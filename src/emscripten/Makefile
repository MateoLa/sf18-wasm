arch = wasm
bits = 64
comp = emscripten
COMP = emscripten
EXE = ../server/sf18.js
popcnt = yes

CXX=emcc
CXXFLAGS += -flto -DUSE_POPCNT

# Build options
minify_js = no
assertion = no
multithread = no
wasm_simd = no
embedded_nnue = no
debug = yes

VPATH := $(VPATH):emscripten
LDFLAGS += -flto
LDFLAGS += --pre-js emscripten/pre.js
# LDFLAGS += --preload-file emscripten/pikafish.nnue@pikafish.nnue
LDFLAGS += -s ENVIRONMENT=web,worker -s MODULARIZE=1 -s EXPORT_NAME="Stockfish" 
LDFLAGS += -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=$$((1 << 27)) -s MAXIMUM_MEMORY=$$((1 << 31))
LDFLAGS += -s FILESYSTEM=1
LDFLAGS += -s "EXPORTED_RUNTIME_METHODS=['cwrap']"
# LDFLAGS += -s EXPORTED_FUNCTIONS="['_main', '_wasm_uci_execute']"
LDFLAGS += -s ALLOW_UNIMPLEMENTED_SYSCALLS


ifeq ($(minify_js),yes)
	LDFLAGS += --closure 1
else
	EMFLAGS += --closure 0 --minify 0
endif

ifeq ($(assertion),yes)
	EMFLAGS += -s ASSERTIONS=1
else
	EMFLAGS += -s ASSERTIONS=0
endif

ifeq ($(multithread),yes)
	CXXFLAGS += -pthread
	LDFLAGS += -s USE_PTHREADS=1 -s PROXY_TO_PTHREAD=1
	LDFLAGS += -s PTHREAD_POOL_SIZE=navigator.hardwareConcurrency
else
	CXXFLAGS += -DSINGLE_THREAD
endif

ifeq ($(wasm_simd),yes)
	CXXFLAGS += -DUSE_WASM_SIMD -msimd128
	SRCS += emscripten/wasm_simd.cpp
endif

ifeq ($(embedded_nnue),no)
	CXXFLAGS += -DNNUE_EMBEDDING_OFF
endif

ifeq ($(debug),yes)
	LDFLAGS += --emit-symbol-map
	ifeq ($(COMP),emscripten)
		LDFLAGS +=  -g -fdebug-compilation-dir='..' -fsanitize=undefined
	endif
endif

EM_EMSCRIPTEN = $(shell emsdk list | grep INSTALLED | head -n 1 | awk '{ print $$1 }')

EXTRACXXFLAGS += -DEM_EMSCRIPTEN=$(EM_EMSCRIPTEN)

EM_ARTIFACTS += ../server/sf18.js ../server/sf18.wasm ../server/sf18.worker.js

wasmclean: clean
	@rm -f $(EM_ARTIFACTS)
