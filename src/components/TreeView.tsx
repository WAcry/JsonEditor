import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import './TreeView.css';

type NodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

interface FlattenedNode {
  id: string;
  depth: number;
  key: string;
  value: unknown;
  type: NodeType;
  hasChildren: boolean;
  childrenCount: number;
  path: (string | number)[];
}

const flattenJson = (
  json: unknown,
  path: (string | number)[] = [],
  depth = 0
): FlattenedNode[] => {
  if (typeof json !== 'object' || json === null) return [];

  return Object.entries(json).flatMap(([key, value]) => {
    const newPath = [...path, Array.isArray(json) ? parseInt(key) : key];
    const id = newPath.join('.');
    const isArray = Array.isArray(value);
    const isObject = typeof value === 'object' && value !== null;
    const type = isArray ? 'array' : (value === null ? 'null' : typeof value as NodeType);
    const hasChildren = isArray || isObject;
    const childrenCount = hasChildren ? Object.keys(value as object).length : 0;

    const currentNode: FlattenedNode = {
      id, depth, key, value, type, hasChildren, childrenCount, path: newPath
    };

    const childrenNodes = hasChildren ? flattenJson(value, newPath, depth + 1) : [];
    return [currentNode, ...childrenNodes];
  });
};

// --- New parsing logic ---
const parseInputValue = (input: string): { success: boolean, value: unknown } => {
  const trimmed = input.trim();
  if (trimmed === 'null') return { success: true, value: null };
  if (trimmed === 'true') return { success: true, value: true };
  if (trimmed === 'false') return { success: true, value: false };

  // Check for quoted string
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return { success: true, value: trimmed.slice(1, -1) };
  }

  // Check for number
  if (trimmed !== '' && !isNaN(Number(trimmed))) {
    // Extra check to prevent octal literals and other edge cases
    if (String(Number(trimmed)) === trimmed) {
       return { success: true, value: Number(trimmed) };
    }
  }

  return { success: false, value: null }; // Invalid input
};


const EditableNode: React.FC<{
  node: FlattenedNode;
  isEditing: boolean;
  onEditStart: () => void;
  onUpdate: (path: (string | number)[], value: unknown) => void;
}> = ({ node, isEditing, onEditStart, onUpdate }) => {
  // For strings, wrap in quotes, for others, convert to string
  const getInitialValue = () => {
      if (node.type === 'string') return JSON.stringify(node.value);
      return String(node.value);
  }
  const [editValue, setEditValue] = useState(getInitialValue());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initialVal = getInitialValue();
    if (isEditing && inputRef.current) {
      inputRef.current.value = initialVal; // Directly set value to handle focus/select correctly
      setEditValue(initialVal);
      inputRef.current.focus();
      inputRef.current.select();
    } else {
      setEditValue(initialVal);
    }
  }, [isEditing, node.value]);

  const commitChange = () => {
    const parsed = parseInputValue(editValue);

    if (parsed.success) {
      // Only update if value has actually changed
      if (JSON.stringify(node.value) !== JSON.stringify(parsed.value)) {
        onUpdate(node.path.slice(1), parsed.value);
      }
    }
    // Always exit edit mode, whether successful or not
    onEditStart();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitChange();
    if (e.key === 'Escape') onEditStart();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        defaultValue={editValue} // Use defaultValue to avoid cursor jumping
        onChange={e => setEditValue(e.target.value)}
        onBlur={commitChange}
        onKeyDown={handleKeyDown}
        className={`node-value-input node-value-${node.type}`}
      />
    );
  }

  return (
    <span
      className={`node-value node-value-${node.type}`}
      onClick={onEditStart}
    >
      {JSON.stringify(node.value)}
    </span>
  );
};


interface NodeData {
  nodes: FlattenedNode[];
  expanded: Record<string, boolean>;
  editingId: string | null;
  toggleNode: (id: string) => void;
  setEditingId: (id: string | null) => void;
  onUpdate: (path: (string | number)[], value: unknown) => void;
}

const Node: React.FC<ListChildComponentProps<NodeData>> = ({ index, style, data }) => {
  const { nodes, expanded, editingId, toggleNode, setEditingId, onUpdate } = data;
  const node = nodes[index];
  const isExpanded = expanded[node.id] ?? (node.depth === 0);

  return (
    <div style={style} className="tree-node">
      <span className="node-indent" style={{ width: `${node.depth * 20}px` }} />
      <span className="node-toggler" onClick={() => node.hasChildren && toggleNode(node.id)}>
        {node.hasChildren && (isExpanded ? '▼' : '►')}
      </span>
      <span className="node-key">"{node.key}":</span>
      {node.hasChildren ? (
        <span className="node-meta">
          {node.type === 'array' ? '[' : '{'} {node.childrenCount} {node.childrenCount === 1 ? 'item' : 'items'} {node.type === 'array' ? ']' : '}'}
        </span>
      ) : (
        <EditableNode
          node={node}
          isEditing={editingId === node.id}
          onEditStart={() => setEditingId(editingId === node.id ? null : node.id)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

interface TreeViewProps {
  data: unknown;
  parseError: string | null;
  onUpdate: (path: (string | number)[], value: unknown) => void;
}

function TreeView({ data, parseError, onUpdate }: TreeViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({'root': true});
  const [editingId, setEditingId] = useState<string | null>(null);

  const flattenedNodes = useMemo(() => {
    return flattenJson({ root: data });
  }, [data]);
  
  const visibleNodes = useMemo(() => {
    return flattenedNodes.filter(node => {
      if (node.depth <= 1) return true;
      const parentPath = node.path.slice(0, -1).join('.');
      return expanded[parentPath] ?? false;
    });
  }, [flattenedNodes, expanded]);

  const toggleNode = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (parseError) {
    return <div className="tree-error">Error: {parseError}</div>;
  }

  return (
    <div className="tree-container">
      <FixedSizeList
        height={window.innerHeight - 41}
        itemCount={visibleNodes.length}
        itemSize={28}
        width="100%"
        itemData={{
          nodes: visibleNodes,
          expanded,
          editingId,
          toggleNode,
          setEditingId,
          onUpdate,
        }}
      >
        {Node}
      </FixedSizeList>
    </div>
  );
}

export default TreeView;