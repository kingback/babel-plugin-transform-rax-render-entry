import Driver from "driver-universal";
import { createElement, render } from "rax";

function App() {}

export default App;
render(createElement(App), null, {
  driver: Driver
});