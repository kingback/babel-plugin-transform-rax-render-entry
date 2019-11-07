import Driver from "driver-universal";
import { Component, createElement, render } from "rax";
export default class App extends Component {}
render(createElement(App), null, {
  driver: Driver
});