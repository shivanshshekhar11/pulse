'use client';

import { useMemo } from 'react';
import { GripVertical, Plus, Trash2, Layers } from 'lucide-react';
import { Button, Input, Select } from '@pulse-flags/ui';
import type { Condition, Operator } from '@pulse-flags/types';

type OperatorOption = { value: Operator; label: string };

type GroupOperator = 'AND' | 'OR' | 'NOT';

type GroupNode = {
  id: string;
  type: 'group';
  operator: GroupOperator;
  children: ConditionNode[];
};

type LeafNode = {
  id: string;
  type: 'leaf';
  attribute: string;
  op: Operator;
  value: string;
};

export type ConditionNode = GroupNode | LeafNode;
export type ConditionGroup = GroupNode;

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function makeLeaf(defaultOp: Operator): LeafNode {
  return {
    id: createId(),
    type: 'leaf',
    attribute: '',
    op: defaultOp,
    value: '',
  };
}

function makeGroup(operator: GroupOperator, defaultOp: Operator): GroupNode {
  return {
    id: createId(),
    type: 'group',
    operator,
    children: [makeLeaf(defaultOp)],
  };
}

export function makeDefaultConditionNode(defaultOp: Operator): GroupNode {
  return makeGroup('AND', defaultOp);
}

export function conditionToNode(condition: Condition, defaultOp: Operator): ConditionNode {
  if ('attribute' in condition) {
    return {
      id: createId(),
      type: 'leaf',
      attribute: condition.attribute,
      op: condition.op,
      value: JSON.stringify(condition.value),
    };
  }

  if (condition.operator === 'NOT') {
    return {
      id: createId(),
      type: 'group',
      operator: 'NOT',
      children: [conditionToNode(condition.condition, defaultOp)],
    };
  }

  return {
    id: createId(),
    type: 'group',
    operator: condition.operator,
    children: condition.conditions.map((child: Condition) => conditionToNode(child, defaultOp)),
  };
}

export function wrapConditionRoot(condition: Condition, defaultOp: Operator): GroupNode {
  const node = conditionToNode(condition, defaultOp);
  if (node.type === 'group') return node;
  return {
    id: createId(),
    type: 'group',
    operator: 'AND',
    children: [node],
  };
}

export function nodeToCondition(node: ConditionNode): Condition {
  if (node.type === 'leaf') {
    return {
      attribute: node.attribute,
      op: node.op,
      value: (() => {
        try {
          return JSON.parse(node.value);
        } catch {
          return node.value;
        }
      })(),
    };
  }

  if (node.operator === 'NOT') {
    const child = node.children[0] ?? makeLeaf('eq');
    return { operator: 'NOT', condition: nodeToCondition(child) };
  }

  return {
    operator: node.operator,
    conditions: node.children.map((child) => nodeToCondition(child)),
  };
}

export function isConditionNodeValid(node: ConditionNode): boolean {
  if (node.type === 'leaf') {
    return node.attribute.trim().length > 0 && node.value.trim().length > 0;
  }
  if (node.operator === 'NOT') {
    return node.children.length === 1 && isConditionNodeValid(node.children[0]!);
  }
  return node.children.length > 0 && node.children.every((child) => isConditionNodeValid(child));
}

function updateNodeAtPath(
  node: ConditionNode,
  path: number[],
  updater: (n: ConditionNode) => ConditionNode,
): ConditionNode {
  if (path.length === 0) return updater(node);
  if (node.type !== 'group') return node;
  const index = path[0] as number;
  const rest = path.slice(1);
  const nextChildren = node.children.map((child, i) => (
    i === index ? updateNodeAtPath(child, rest, updater) : child
  ));
  return { ...node, children: nextChildren };
}

function removeNodeAtPath(root: ConditionNode, path: number[]): { removed: ConditionNode; next: ConditionNode } {
  if (path.length === 0) return { removed: root, next: root };
  if (root.type !== 'group') return { removed: root, next: root };

  const index = path[0] as number;
  const rest = path.slice(1);
  const target = root.children[index];
  if (!target) return { removed: root, next: root };

  if (rest.length === 0) {
    const nextChildren = root.children.filter((_, i) => i !== index);
    return { removed: target, next: { ...root, children: nextChildren } };
  }

  const { removed, next } = removeNodeAtPath(target, rest);
  const nextChildren = root.children.map((child, i) => (i === index ? next : child));
  return { removed, next: { ...root, children: nextChildren } };
}

function insertNodeAtPath(
  root: ConditionNode,
  parentPath: number[],
  index: number,
  node: ConditionNode,
): ConditionNode {
  if (parentPath.length === 0) {
    if (root.type !== 'group') return root;
    if (root.operator === 'NOT') {
      return { ...root, children: [node] };
    }
    const nextChildren = [...root.children];
    nextChildren.splice(index, 0, node);
    return { ...root, children: nextChildren };
  }

  if (root.type !== 'group') return root;
  const [i, ...rest] = parentPath;
  const nextChildren = root.children.map((child, idx) => (
    idx === i ? insertNodeAtPath(child, rest, index, node) : child
  ));
  return { ...root, children: nextChildren };
}

function isAncestorPath(ancestor: number[], path: number[]) {
  if (ancestor.length >= path.length) return false;
  return ancestor.every((v, i) => v === path[i]);
}

function moveNode(
  root: ConditionNode,
  sourcePath: number[],
  targetParentPath: number[],
  targetIndex: number,
) {
  if (isAncestorPath(sourcePath, targetParentPath)) return root;

  const { removed, next } = removeNodeAtPath(root, sourcePath);
  const sourceParent = sourcePath.slice(0, -1);
  const sourceIndex = sourcePath[sourcePath.length - 1] ?? 0;

  let adjustedIndex = targetIndex;
  if (sourceParent.join('.') === targetParentPath.join('.') && sourceIndex < targetIndex) {
    adjustedIndex = targetIndex - 1;
  }

  return insertNodeAtPath(next, targetParentPath, adjustedIndex, removed);
}

function parsePath(raw: string) {
  try {
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ConditionBuilder({
  root,
  onChange,
  operators,
  disabled,
}: {
  root: GroupNode;
  onChange: (node: GroupNode) => void;
  operators: OperatorOption[];
  disabled?: boolean;
}) {
  const defaultOp = useMemo(() => operators[0]?.value ?? 'eq', [operators]);

  const updateAt = (path: number[], updater: (n: ConditionNode) => ConditionNode) => {
    const next = updateNodeAtPath(root, path, updater) as GroupNode;
    onChange(next);
  };

  const addLeaf = (path: number[]) => {
    const next = insertNodeAtPath(root, path, root.children.length, makeLeaf(defaultOp)) as GroupNode;
    onChange(next);
  };

  const addGroup = (path: number[]) => {
    const next = insertNodeAtPath(root, path, root.children.length, makeGroup('AND', defaultOp)) as GroupNode;
    onChange(next);
  };

  const removeAt = (path: number[]) => {
    const { next } = removeNodeAtPath(root, path);
    onChange(next as GroupNode);
  };

  const handleDrop = (sourcePath: number[], targetParentPath: number[], targetIndex: number) => {
    const next = moveNode(root, sourcePath, targetParentPath, targetIndex) as GroupNode;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <GroupEditor
        node={root}
        path={[]}
        onChange={updateAt}
        onAddLeaf={addLeaf}
        onAddGroup={addGroup}
        onRemove={removeAt}
        onDrop={handleDrop}
        operators={operators}
        disabled={disabled}
        isRoot
      />
    </div>
  );
}

function GroupEditor({
  node,
  path,
  onChange,
  onAddLeaf,
  onAddGroup,
  onRemove,
  onDrop,
  operators,
  disabled,
  isRoot,
}: {
  node: GroupNode;
  path: number[];
  onChange: (path: number[], updater: (n: ConditionNode) => ConditionNode) => void;
  onAddLeaf: (path: number[]) => void;
  onAddGroup: (path: number[]) => void;
  onRemove: (path: number[]) => void;
  onDrop: (sourcePath: number[], targetParentPath: number[], targetIndex: number) => void;
  operators: OperatorOption[];
  disabled?: boolean;
  isRoot?: boolean;
}) {
  const onDragStart = (e: React.DragEvent, sourcePath: number[]) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(sourcePath));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDropBefore = (e: React.DragEvent, targetPath: number[]) => {
    e.preventDefault();
    const sourcePath = parsePath(e.dataTransfer.getData('text/plain'));
    if (sourcePath.length === 0) return;
    const targetParentPath = targetPath.slice(0, -1);
    const index = targetPath[targetPath.length - 1] ?? 0;
    onDrop(sourcePath, targetParentPath, index);
  };

  const onDropAppend = (e: React.DragEvent) => {
    e.preventDefault();
    const sourcePath = parsePath(e.dataTransfer.getData('text/plain'));
    if (sourcePath.length === 0) return;
    onDrop(sourcePath, path, node.children.length);
  };

  const operatorOptions = [
    { value: 'AND', label: 'AND' },
    { value: 'OR', label: 'OR' },
    { value: 'NOT', label: 'NOT' },
  ];

  return (
    <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface-2">
        <Layers className="size-3.5 text-dim" />
        <div className="w-24">
          <Select
            value={node.operator}
            onChange={(v) => {
              const op = v as GroupOperator;
              onChange(path, (n) => {
                if (n.type !== 'group') return n;
                const next = { ...n, operator: op } as GroupNode;
                if (op === 'NOT') {
                  next.children = n.children.length > 0 ? [n.children[0]!] : [makeLeaf(operators[0]?.value ?? 'eq')];
                }
                return next;
              });
            }}
            options={operatorOptions}
            disabled={disabled}
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => onAddLeaf(path)} disabled={disabled}>
          condition
        </Button>
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => onAddGroup(path)} disabled={disabled}>
          group
        </Button>
        {!isRoot && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onRemove(path)} disabled={disabled}>
            delete
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {node.children.length === 0 && (
          <div className="font-mono text-[12px] text-dim">// no conditions</div>
        )}
        {node.children.map((child, i) => {
          const childPath = [...path, i];
          const dragHandle = (
            <span className="size-6 grid place-items-center rounded border border-border bg-surface-2 text-dim">
              <GripVertical className="size-3.5" />
            </span>
          );

          return (
            <div
              key={child.id}
              className="rounded-md border border-border bg-surface-0"
              draggable={!disabled}
              onDragStart={(e) => onDragStart(e, childPath)}
              onDragOver={onDragOver}
              onDrop={(e) => onDropBefore(e, childPath)}
            >
              {child.type === 'leaf' ? (
                <div className="flex items-center gap-2 p-3">
                  {dragHandle}
                  <Input
                    mono
                    placeholder="attribute"
                    value={child.attribute}
                    onChange={(e) => onChange(childPath, (n) => ({
                      ...(n as LeafNode),
                      attribute: e.target.value,
                    }))}
                    disabled={disabled}
                    className="flex-1"
                  />
                  <Select
                    value={child.op}
                    onChange={(v) => onChange(childPath, (n) => ({
                      ...(n as LeafNode),
                      op: v as Operator,
                    }))}
                    options={operators}
                    disabled={disabled}
                    className="w-32"
                  />
                  <Input
                    mono
                    placeholder='value or ["a","b"]'
                    value={child.value}
                    onChange={(e) => onChange(childPath, (n) => ({
                      ...(n as LeafNode),
                      value: e.target.value,
                    }))}
                    disabled={disabled}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(childPath)}
                    disabled={disabled}
                    className="size-8 grid place-items-center rounded border border-border bg-surface-2 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {dragHandle}
                    <span className="font-mono text-[11px] text-muted-foreground">group</span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => onRemove(childPath)}
                      disabled={disabled}
                      className="size-8 grid place-items-center rounded border border-border bg-surface-2 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <GroupEditor
                    node={child}
                    path={childPath}
                    onChange={onChange}
                    onAddLeaf={onAddLeaf}
                    onAddGroup={onAddGroup}
                    onRemove={onRemove}
                    onDrop={onDrop}
                    operators={operators}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          );
        })}
        <div
          className="rounded-md border border-dashed border-border px-3 py-2 text-[11.5px] text-dim"
          onDragOver={onDragOver}
          onDrop={onDropAppend}
        >
          drop here to append
        </div>
      </div>
    </div>
  );
}
