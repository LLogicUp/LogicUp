import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>LogicUp</h1>
      </header>
      <main className="main-container">
        <div className="code-editor">
          <h2>Code Input</h2>
          <textarea placeholder="Enter your code here..."></textarea>
        </div>
        <div className="hint-display">
          <h2>Hint</h2>
          <div className="hint-content">
            <p>Your hint will appear here.</p>
          </div>
        </div>
      </main>
      <footer className="App-footer">
        <button>힌트 요청</button>
      </footer>
    </div>
  );
}

export default App;
