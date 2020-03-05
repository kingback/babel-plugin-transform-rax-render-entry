# babel-plugin-transform-rax-render-entry

## Example

**In**

```js
import { createElement } from "rax";
export default function App() {}
```

**Out**

```js
import { createElement, render } from "rax";
import __driver from "driver-universal";
export default function App() {}
const __root = document.querySelector && document.querySelector('#root') || null;
const __hydrate = __root && __root.hasAttribute('data-hydrate') || false;
render(createElement(App), __root, { driver: __driver, hydrate: __hydrate });
```

## Installation

```sh
$ npm install babel-plugin-transform-rax-render-entry
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": [
    ["transform-rax-render-entry", {
      "include": /my-entry\.js/,
      "root": "#root" // default #root
    }]
  ]
}
```

- include: Required, paths of your entry files, can be regexp, array, string and function.

### Via CLI

```sh
$ babel --plugins transform-rax-render-entry script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["transform-rax-render-entry"]
});
```
