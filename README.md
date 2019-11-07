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
import Driver from "driver-universal";
export default function App() {}
render(createElement(App), null, { driver: Driver });
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
      "include": /my-entry\.js/
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
