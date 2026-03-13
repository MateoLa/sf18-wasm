### Using Web Workers

Web Workers are a simple means for web content to run scripts in background threads. The worker thread can perform tasks without interfering with the user interface. In addition, they can make network requests using the fetch() or XMLHttpRequest APIs. Once created, a worker can send messages to the JavaScript code that created it by posting messages to an event handler specified by that code (and vice versa).

### Web Workers API

A worker is an object created using a constructor (e.g., Worker()) that runs a named JavaScript file. This file contains the code that will run in the worker thread; workers run in another global context that is different from the current window. Thus, using the window shortcut to get the current global scope (instead of self) within a Worker will return an error.

The worker context is represented by a DedicatedWorkerGlobalScope object in the case of dedicated workers (standard workers that are utilized by a single script; shared workers use SharedWorkerGlobalScope). A dedicated worker is only accessible from the script that first spawned it, whereas shared workers can be accessed from multiple scripts.

You can run whatever code you like inside the worker thread, with some exceptions. For example, you can't directly manipulate the DOM from inside a worker, or use some default methods and properties of the window object. But you can use a large number of items available under window, including WebSockets, and data storage mechanisms like IndexedDB.

Data is sent between workers and the main thread via a system of messages. Both sides send their messages using the postMessage() method, and respond to messages via the onmessage event handler (the message is contained within the message event's data attribute). The data is copied rather than shared.

Workers may in turn spawn new workers, as long as those workers are hosted within the same origin as the parent page.

### Dedicated workers

As mentioned above, a dedicated worker is only accessible by the script that called it. 

In this section we'll discuss the JavaScript to enter two numbers to be multiplied together. The numbers are sent to a dedicated worker, multiplied together, and the result is returned to the page and displayed.

### Worker feature detection

For slightly more controlled error handling and backwards compatibility, it is a good idea to wrap your worker accessing code in the following (main.js):

```js
if (window.Worker) {
  // …
}
```

### Spawning a dedicated worker

Creating a new worker is simple. All you need to do is call the Worker() constructor, specifying the URI of a script to execute in the worker thread (main.js):

```js
const myWorker = new Worker("worker.js");
```

### Sending messages to and from a dedicated worker

The magic of workers happens via the postMessage() method and the onmessage event handler. When you want to send a message to the worker, you post messages to it like this (main.js):

```js
[first, second].forEach((input) => {
  input.onchange = () => {
    myWorker.postMessage([first.value, second.value]);
    console.log("Message posted to worker");
  };
});
```

In the worker, we can respond when the message is received by writing an event handler block like this (worker.js):

```js
onmessage = (e) => {
  console.log("Message received from main script");
  const workerResult = `Result: ${e.data[0] * e.data[1]}`;
  console.log("Posting message back to main script");
  postMessage(workerResult);
};
```

The onmessage handler allows us to run some code whenever a message is received, with the message itself being available in the message event's data attribute. Here we multiply together the two numbers then use postMessage() again, to post the result back to the main thread.

Back in the main thread, we use onmessage again, to respond to the message sent back from the worker:

```js
myWorker.onmessage = (e) => {
  result.textContent = e.data;
  console.log("Message received from worker");
};
```

Here we grab the message event data and set it as the textContent of the result paragraph, so the user can see the result of the calculation.

* Notice that onmessage and postMessage() need to be hung off the Worker object when used in the main script thread, but not when used in the worker. This is because, inside the worker, the worker is effectively the global scope.

* When a message is passed between the main thread and worker, it is copied or "transferred" (moved), not shared.

### Terminating a worker

If you need to immediately terminate a running worker from the main thread, you can do so by calling the worker's terminate method:

```js
myWorker.terminate();
```

The worker thread is killed immediately.

### Handling errors

When a runtime error occurs in the worker, its onerror event handler is called. It receives an event named error which implements the ErrorEvent interface.

The event doesn't bubble and is cancelable; to prevent the default action from taking place, the worker can call the error event's preventDefault() method.

The error event has the following three fields that are of interest:

message:    A human-readable error message.
filename:   The name of the script file in which the error occurred.
lineno:     The line number of the script file on which the error occurred.

### Content security policy

Workers are considered to have their own execution context, distinct from the document that created them. For this reason they are, in general, not governed by the content security policy of the document that created them.

To specify a content security policy for the worker, set a Content-Security-Policy response header for the request which delivered the worker script itself.

The exception to this is if the worker script's origin is a globally unique identifier (for example, if its URL has a scheme of data or blob). In this case, the worker does inherit the CSP of the document or worker that created it.

### Example

Performing computations in the background

Workers are mainly useful for allowing your code to perform processor-intensive calculations without blocking the user interface thread. In this example, a worker is used to calculate Fibonacci numbers.

The following JavaScript code is stored in the "fibonacci.js" file referenced by the HTML.

```js
self.onmessage = (event) => {
  const userNum = Number(event.data);
  self.postMessage(fibonacci(userNum));
};

function fibonacci(num) {
  let a = 1;
  let b = 0;
  while (num > 0) {
    [a, b] = [a + b, a];
    num--;
  }

  return b;
}
```

The worker sets the property onmessage to a function which will receive messages sent when the worker object's postMessage() is called. This performs the math and eventually returns the result back to the main thread.

The HTML code:

```html
<form>
  <div>
    <label for="number">
      Enter a number that is a zero-based index position in the fibonacci
      sequence to see what number is in that position. For example, enter 6 and
      you'll get a result of 8 — the fibonacci number at index position 6 is 8.
    </label>
    <input type="number" id="number" />
  </div>
  <div>
    <input type="submit" />
  </div>
</form>

<p id="result"></p>
```

It needs to execute the following script, either inline or as an external file:

```js
const form = document.querySelector("form");
const input = document.querySelector('input[type="number"]');
const result = document.querySelector("p#result");
const worker = new Worker("fibonacci.js");

worker.onmessage = (event) => {
  result.textContent = event.data;
  console.log(`Got: ${event.data}`);
};

worker.onerror = (error) => {
  console.log(`Worker error: ${error.message}`);
  throw error;
};

form.onsubmit = (e) => {
  e.preventDefault();
  worker.postMessage(input.value);
  input.value = "";
};
```

The web page creates a <p> element with the ID result, which gets used to display the result, then spawns the worker. After spawning the worker, the onmessage handler is configured to display the results by setting the contents of the <p> element, and the onerror handler is set to log the error message to the devtools console.

Finally, a message is sent to the worker to start it.

### Debugging worker threads

Most browsers enable you to debug web workers in their JavaScript debuggers in exactly the same way as debugging the main thread! For example, both Firefox and Chrome list JavaScript source files for both the main thread and active worker threads, and all of these files can be opened to set breakpoints and logpoints.

To open devtools for web workers, you can use the following URLs:

    Edge: edge://inspect/
    Chrome: chrome://inspect/
    Firefox: about:debugging#/runtime/this-firefox

These pages show an overview over all service workers. You need to find the relevant one by the URL and then click inspect to access devtools such as the console and debugger for that worker.

### Note

Extracted from https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers

