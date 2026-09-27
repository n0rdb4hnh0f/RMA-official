import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { assertNetworkIntegrity } from './lib/network'

// Fail loudly during development instead of publishing a station that lists a
// line which does not call there.
if (import.meta.env.DEV) assertNetworkIntegrity()

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
