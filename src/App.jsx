import { useEffect, useRef, useState } from 'react'
import Progress from './components/Progress';

import './App.css'

function App() {

  // Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [input, setInput] = useState('Article about war in Syria');
  const [output, setOutput] = useState('');

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate':
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems(prev => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems(
            prev => prev.map(item => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress }
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems(
            prev => prev.filter(item => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case 'update':
          // Generation update: update the output text.
          setOutput(e.data.output);
          break;

        case 'complete':
          // Generation complete: re-enable the "Search" button
          console.log('complete', JSON.stringify(e.data.output));
          fetch('/librarian/vector', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify('foobar') //{ text: e.data.output }
          })
          .then(res => {
            console.log('res', res)
            setOutput(res.statusText)
          })
          // .then(res => res.json())
          // .then(res => {
          //   console.log('res', res)
          //   setOutput(res.json())
          // });
          setDisabled(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const search = () => {
    setDisabled(true);
    worker.current.postMessage({
      text: input,
    });
  }

  return (
    <>
      <h1>Uqbar Librarian</h1>
      <h2>P2P Document Search Powered by ML</h2>

      <div className='container'>
        <div className='textbox-container'>
          <input value={input} rows={3} onChange={e => setInput(e.target.value)}></input>
          <button disabled={disabled} onClick={search}>Search</button>
        </div>
      </div>
      {/* TODO better output */}
      <p>{output}</p>
      <div className='progress-bars-container'>
        {ready === false && (
          <label>Loading models... (only run once)</label>
        )}
        {progressItems.map(data => (
          <div key={data.file}>
            <Progress text={data.file} percentage={data.progress} />
          </div>
        ))}
      </div>
    </>
  )
}

export default App
