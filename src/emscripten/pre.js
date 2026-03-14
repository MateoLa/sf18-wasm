// Sin Uso. (Se usa en utils.h en la funcion emscripten_utils_getline)
// Simple queue (assume single consumer)
//
class Queue {
  constructor() {
    this.getter = null;
    this.list = [];
  }
  async get() {
    if (this.list.length > 0) {
      return this.list.shift();
    }
    return await new Promise((resolve) => (this.getter = resolve));
  }
  put(x) {
    if (this.getter) {
      this.getter(x);
      this.getter = null;
      return;
    }
    this.list.push(x);
  }
}


//
// API
//

const listeners = [];

Module["addMessageListener"] = (listener) => {
  listeners.push(listener);
};

Module["removeMessageListener"] = (listener) => {
  const i = listeners.indexOf(listener);
  if (i >= 0) listeners.splice(i, 1);
};

Module["print"] = Module["printErr"] = (data) => {
  if (listeners.length === 0) {
    console.log(data);
    return;
  }
  for (let listener of listeners) {
    listener(data);
  }
};

Module["terminate"] = () => {
  PThread.terminateAllThreads();
};
