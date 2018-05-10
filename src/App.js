import React, { Component } from 'react';
import './App.css';

import NeoVim from './components/NeoVim';

class App extends Component {
  render() {
    return (
      <NeoVim rows={30} cols={100} />
    );
  }
}

export default App;
