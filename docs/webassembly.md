### Compiling C/C++ to WebAssembly

Browsers don't know how to run C code.
WebAssembly is a W3C standard to facilitate high-performance applications on web pages.
You can compile C/C++ into WebAssembly using a tool like Emscripten.


```c
#include <iostream>

int main() {
    std::cout << "Greetings from ML!!\n";
    return 0;
}
```

```sh
emcc hello.cpp -o hello.html --emrun
```

At this point in your source directory you should have:
    The binary Wasm module code: hello.wasm
    A JS file containing glue code to translate between the native C functions and JS: hello.js
    An HTML file to load, compile, and instantiate your Wasm code in the browser: hello.html

### Compiling to JavaScript

Emscripten requires a large variety of JavaScript "glue" code to handle memory allocation, memory leaks, and a host of other problems.

```sh
emcc -o hello.js hello.c -O3
```
You could then incorporate this JavaScript file into your program. In your app's entry module, add:

```js
import "./hello.js";
```

Alternatively, you can produce a factory module, which allows you to produce multiple instances of the module (by default the glue code loads the module globally, causing multiple instances to collide).

* If your output file extension is .js and not .mjs, then you have to add the -sEXPORT_ES6 setting to output a JavaScript module.

```sh
emcc -o hello.mjs hello.c -O3 -sMODULARIZE -sEXPORT_ES6
```

Then in your code import the factory and call it:

```js
import createModule from "./hello.mjs";

createModule().then((Module) => {
  console.log("Wasm ready", Module);
});
```

### Calling a custom function defined in C

If you want to call a function defined in your C code from JavaScript, you can use the Emscripten ccall() function and the EMSCRIPTEN_KEEPALIVE declaration, which adds your functions to the exported functions list.

```c
#include <stdio.h>
#include <emscripten/emscripten.h>

int main() {
    printf("Hello World\n");
    return 0;
}

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif

EXTERN EMSCRIPTEN_KEEPALIVE void myFunction(int argc, char ** argv) {
    printf("MyFunction Called\n");
}
```

Emscripten remove any function that is not called from the compiled code. This can remove functions that you plan to call outside of the compiled code. There is no special logic to keep main() alive by default and it should be in the export list. <br> 
EMSCRIPTEN_KEEPALIVE stops this from happening (import the emscripten.h library). It also exports the function, as if it were on EXPORTED_FUNCTIONS.

* We are including the #ifdef blocks so that if you are trying to include this in C++ code, the example will still work. Due to C versus C++ name mangling rules, this would otherwise break, but here we are setting it so that it treats it as an external C function if you are using C++.

```sh
emcc -o hello.js hello.c -s NO_EXIT_RUNTIME=1 -s "EXPORTED_RUNTIME_METHODS=['ccall']" -s MODULARIZE -s EXPORT_ES6
```

* Note that we need to compile with NO_EXIT_RUNTIME: otherwise, when main() exits, the runtime would be shut down and it wouldn't be valid to call compiled code. This is necessary for proper C emulation: for example, to ensure that atexit() functions are called.

You need to run the new myFunction() function from JavaScript. 

Add a <button> element to your html.

```html
<button id="my-button">Run myFunction</button>
```
Add the following code at the end of the first <script> element:

```js
document.getElementById("my-button").addEventListener("click", () => {
  alert("check console");
  const result = Module.ccall(
    "myFunction", // name of C function
    null, // return type
    null, // argument types
    null, // arguments
  );
});
```
This illustrates how ccall() is used to call the exported function.

### Note

Extracted from https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/C_to_Wasm

