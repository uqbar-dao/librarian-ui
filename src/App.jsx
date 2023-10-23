import { useEffect, useRef, useState } from 'react'
import Progress from './components/Progress';
import Loader from './components/Loader';

import './App.css'

function App() {

  // Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [input, setInput] = useState('');
  const [output, setOutput] = useState([]);

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(`${window.location.origin}/librarian/worker.js`, {
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
        
        case 'complete':
          // Generation complete: re-enable the "Search" button
          // console.log('complete', JSON.stringify(e.data.output));
          fetch('/librarian/vector', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              "namespace": "default",
              "includeValues": false,
              "includeMetadata": true,
              "topK": 10,
              "vector": Object.values(e.data.output)
            })
          })
          .then(res => res.json())
          .then(res => {
            console.log('res', res.matches)
            setOutput(res.matches)
            setDisabled(false);
          })
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
      <h2>Searching <code>drew.uq</code>&apos;s <code>news</code> database</h2>
      <div className='container' style={{minWidth: '700px'}}>
        <div className='textbox-container' style={{marginBottom: '0'}}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder='query for articles here'></input>
          <button disabled={disabled} onClick={search}>Search</button>
        </div>
        {/* <h6 style={{marginTop: '0', marginBottom: '0', color: 'gray'}}>P2P Document Search powered by AI</h6> */}
      </div>
      { disabled && <Loader/> }
      <div className='container'>
        {
          output && output.map((article, i) => <Article key={i} article={article} />)
        }
      </div>
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

function Article(props) {
  const { key, article } = props;
  const [expanded, setExpanded] = useState(false);

  article.metadata.truncated = `${article.metadata.article.slice(0, 200)}...`

  return (
    <div key={key} className='article'>
      <a href={article.metadata.url}>
        <h1 className='article-title'>{article.metadata.title}</h1>
      </a>
      <h3 className='article-author'>
        {article.metadata.author} | {article.metadata.publication}
      </h3>
      <p className='article-content'>
        {
          expanded? article.metadata.article : article.metadata.truncated
        }
      </p>
      <span className='read-more-link' onClick={() => setExpanded(!expanded)}>
        {expanded? 'Collapse' : 'Read More'}
      </span>
    </div>
  );
}

export default App
