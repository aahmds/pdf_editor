import { Editor } from './components/Editor';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF Editor</h1>
      </header>
      <main>
        <Editor />
      </main>
    </div>
  );
}

export default App;
