import { printTree } from './Factor.ts'

import './App.css'
import { Solver } from './Solver.ts'

const answerCache: { [k: string]: string } = {};
function handleNumberEntered(num: number) {
  if (answerCache['' + num]) {
    const resulteq = document.getElementById('resulteq');
    if (resulteq) {
      const str = answerCache['' + num];
      resulteq.innerText = '' + num + ' = ' + str;
    }
    return;
  }
  const s = new Solver();
  const tree = s.findTopTreeFor(num);
  const str = printTree(tree);
  answerCache['' + num] = str;
  const resulteq = document.getElementById('resulteq');
  if (resulteq) {
    resulteq.innerText = '' + num + ' = ' + str;
  }
}
function App() {
  return (
    <>
      <h1>Beltmatic Calculator</h1>
      <div className="container">
        Number:<input type="number" onKeyUp={(e) => {
          //          if (e.key == 'Enter') {
          handleNumberEntered(+(e.target as HTMLInputElement).value);
          //          }
          return false;
        }
        } />
        <h2 id="resulteq"> Enter number above</h2>
      </div>
      <a href="https://store.steampowered.com/app/2674590/Beltmatic/"><h3>Beltmatic on Steam</h3></a>
    </>
  )
}

export default App
