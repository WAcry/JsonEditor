import { useState, useEffect } from 'react';
import { produce } from 'immer';
import './App.css';
import TextView from './components/TextView';
import TreeView from './components/TreeView';

const initialJson = `{
  "name": "John Doe",
  "age": 30,
  "isStudent": false,
  "courses": [
    { "title": "History", "credits": 3 },
    { "title": "Math", "credits": 4 }
  ],
  "address": null
}`;

function App() {
  // `data` 是对象的规范状态，是 TreeView 的数据源
  const [data, setData] = useState<unknown>(() => JSON.parse(initialJson));
  
  // `text` 是文本编辑器的字符串状态，可能与 data 不同步或无效
  const [text, setText] = useState(() => JSON.stringify(JSON.parse(initialJson), null, 2));

  const [parseError, setParseError] = useState<string | null>(null);

  // 当文本输入变化时，尝试解析并更新规范的 data 状态
  useEffect(() => {
    try {
      const newData = JSON.parse(text);
      setData(newData);
      setParseError(null);
    } catch (e) {
      if (e instanceof Error) {
        setParseError(e.message);
      } else {
        setParseError('Invalid JSON');
      }
    }
  }, [text]);

  // 此函数将传递给树状视图以处理编辑
  const handleTextChange = (value: string | undefined) => {
    setText(value ?? '');
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
    } catch (error) {
      alert('JSON 格式无效，无法格式化！');
    }
  };

  const updateDataFromTree = (path: (string | number)[], value: unknown) => {
    const newData = produce(data, (draft: unknown) => {
      // 在 draft 上操作前做类型检查
      if (typeof draft !== 'object' || draft === null) return;
      
      let current = draft as Record<string | number, unknown>; // 使用类型断言
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] as Record<string | number, unknown>;
      }
      current[path[path.length - 1]] = value;
    });
    // 当从树状视图更新数据时，同时更新 data 和 text
    setData(newData);
    setText(JSON.stringify(newData, null, 2));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>JSON Visual Editor</h1>
          <button onClick={handleFormat} className="header-button">格式化</button>
        </div>
      </header>
      <main className="main-content">
        <div className="pane">
          <TreeView data={data} onUpdate={updateDataFromTree} parseError={parseError} />
        </div>
        <div className="pane">
          <TextView value={text} onChange={handleTextChange} />
        </div>
      </main>
    </div>
  );
}

export default App;
