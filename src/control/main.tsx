import { render } from "preact";
import { App } from "./App";
import "./control.css";

export function startControl(root: HTMLElement) {
  document.title = "Panel de control";
  render(<App />, root);
}
