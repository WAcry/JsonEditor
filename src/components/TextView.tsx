import Editor from '@monaco-editor/react';

interface TextViewProps {
  value: string;
  onChange: (value: string | undefined) => void;
}

function TextView({ value, onChange }: TextViewProps) {
  return (
    <Editor
      height="100%"
      language="json"
      theme="vs-dark"
      value={value}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: {
          top: 16
        }
      }}
    />
  );
}

export default TextView;