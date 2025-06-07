import {useState, useEffect, useMemo} from 'react';
import {produce} from 'immer';
import './App.css';
import TextView from './components/TextView';
import TreeView from './components/TreeView';
import SchemaView from './components/SchemaView';

const initialJson = `{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "expression": "1 + 2",
  "age": 30,
  "isStudent": false,
  "courses": [],
  "address": "https://example.com"
}`;
const initialSchema = `{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "The unique identifier for the user."
    },
    "expression": {
      "type": "string",
      "format": "expression",
      "description": "A valid JavaScript expression.",
      "examples": ["user.age > 18", "a * (b + c)"]
    },
    "age": {
      "type": "number",
      "minimum": 18,
      "description": "User's age, must be 18 or older."
    },
    "isStudent": {
      "type": "boolean",
      "description": "Indicates if the user is currently a student."
    },
    "courses": {
      "type": "array",
      "description": "List of courses the user is enrolled in."
    },
    "address": {
      "type": "string",
      "format": "uri",
      "description": "A valid URI for the user's profile."
    }
  },
  "required": ["id", "expression", "age"]
}`;


type Pane = 'tree' | 'text' | 'schema';

function App() {
    const [data, setData] = useState<unknown>(() => JSON.parse(initialJson));
    const [text, setText] = useState(() => JSON.stringify(JSON.parse(initialJson), null, 2));
    const [schemaText, setSchemaText] = useState(() => JSON.stringify(JSON.parse(initialSchema), null, 2));
    const [parseError, setParseError] = useState<string | null>(null);
    const [visiblePanes, setVisiblePanes] = useState<Record<Pane, boolean>>({
        tree: true,
        text: true,
        schema: true,
    });

    useEffect(() => {
        try {
            const newData = JSON.parse(text);
            setData(newData);
            setParseError(null);
        } catch (e) {
            setParseError(e instanceof Error ? e.message : 'Invalid JSON');
        }
    }, [text]);


    const handleTextChange = (value: string | undefined) => setText(value ?? '');
    const handleSchemaChange = (value: string | undefined) => setSchemaText(value ?? '');

    const handleFormat = () => {
        try {
            if (text.trim() !== '') {
                setText(JSON.stringify(JSON.parse(text), null, 2));
            }
        } catch {
            alert(`The content of the JSON view is not valid JSON and could not be formatted.`);
        }
        try {
            if (schemaText.trim() !== '') {
                setSchemaText(JSON.stringify(JSON.parse(schemaText), null, 2));
            }
        } catch {
            alert(`The content of the Schema view is not valid JSON and could not be formatted.`);
        }
    };

    const updateDataFromTree = (path: (string | number)[], value: unknown) => {
        const newData = produce(data, (draft: unknown) => {
            if (typeof draft !== 'object' || draft === null) return;
            let current = draft as Record<string | number, unknown>;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]] as Record<string | number, unknown>;
            }
            current[path[path.length - 1]] = value;
        });
        setData(newData);
        setText(JSON.stringify(newData, null, 2));
    };

    const togglePane = (pane: Pane) => {
        setVisiblePanes(prev => ({...prev, [pane]: !prev[pane]}));
    }

    const gridTemplateColumns = useMemo(() => {
        const count = Object.values(visiblePanes).filter(Boolean).length;
        if (count === 0) return '0';
        return `repeat(${count}, 1fr)`;
    }, [visiblePanes]);

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <h1>JSON Visual Editor</h1>
                    <div className="view-toggler">
                        <button className={`toggle-button ${visiblePanes.schema ? 'active' : ''}`}
                                onClick={() => togglePane('schema')}>Schema
                        </button>
                        <button className={`toggle-button ${visiblePanes.text ? 'active' : ''}`}
                                onClick={() => togglePane('text')}>Text
                        </button>
                        <button className={`toggle-button ${visiblePanes.tree ? 'active' : ''}`}
                                onClick={() => togglePane('tree')}>Tree
                        </button>
                    </div>
                    <button onClick={handleFormat} className="header-button">Format</button>
                </div>
            </header>
            <main className="main-content" style={{gridTemplateColumns}}>
                {visiblePanes.schema && <div className="pane">
                    <SchemaView value={schemaText} onChange={handleSchemaChange}/>
                </div>}
                {visiblePanes.text && <div className="pane">
                    <TextView value={text} onChange={handleTextChange} schemaText={schemaText}/>
                </div>}
                {visiblePanes.tree && <div className="pane">
                    <TreeView
                        data={data}
                        onUpdate={updateDataFromTree}
                        parseError={parseError}
                    />
                </div>}
            </main>
        </div>
    );
}

export default App;
