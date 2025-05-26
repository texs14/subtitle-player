import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';      // регистрирует backend

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// onnxruntime-web проверяет глобальный tf:
(globalThis as any).tf = tf;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
