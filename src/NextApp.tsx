import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import App from './App';

(globalThis as any).tf = tf;

export default function NextApp() {
  return <App />;
}
