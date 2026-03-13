### Wasm - Workers

WebAssembly is a binary format that helps developers achieve near-native performance inside the browser.

When a WebAssembly module (wasm) is moved to a web worker, the main thread is kept free because the process of fetching, compiling, and initializing happens on a separate thread.

We’ll see a small example to learn how to use WebAssembly modules inside web workers. You’ll write a function to add numbers in C++, convert the function to wasm using Emscripten, and then import the wasm file in a web worker. At the same time, we’ll also learn about communicating data across the main and worker threads in a convenient way.

### C++

Once we’ve installed Emscripten we can write a function that adds two numbers in C++:

```c
#include <iostream>

// extern "C" makes sure that the compiler does not mangle the name.
extern "C" {
    int add(int a, int b) {
        return a + b;
    }
}
```

Use Emscripten to compile the C++ code to WebAssembly with the following command:

```sh
emcc add.cpp -s ENVIRONMENT=worker -s MODULARIZE=1 -s EXPORTED_FUNCTIONS="['_add']" -o add.js
```

This will generate two files, named add.wasm and add.js, in the same directory. These files are the ones you can import directly on the web.

You can now successfully import the wasm file in the web worker file. 


```js
import addWasm from './wasm/add.wasm';
import addJS from './wasm/add.js';

const sum = async (a, b) =>
  new Promise(async (resolve) => {
    const wasm = await fetch(addWasm);
    const buffer = await wasm.arrayBuffer();
    const _instance = await addJS({
      wasmBinary: buffer,
    });

    resolve(_instance._add(a, b));
  });

module.exports = {sum};  // corregir acá.
```

O de otra forma:

```js
sum = new Worker("./wasm/add.js");
```

Y luego:

```js
(async function () {
  const result = await sum(1, 4);
  alert(result);
})();
```