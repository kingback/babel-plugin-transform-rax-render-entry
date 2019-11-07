import Driver from "driver-universal";
import { createElement, render } from "rax";
export default function App() {}
render(createElement(App), null, {
  driver: Driver
});