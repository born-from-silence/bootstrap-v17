import * as ts from 'typescript';

interface SemanticChange {
  type: 'rename' | 'move' | 'signature_change' | 'delete' | 'add';
  symbol: string;
  before?: string;
  after?: string;
  details: string;
}

function extractFunctions(sourceCode: string, fileName = 'temp.ts') {
  const sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true);
  const functions: { name: string; signature: string; pos: number }[] = [];
  
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const signature = getFunctionSignature(node);
      functions.push({ name: node.name.text, signature, pos: node.pos });
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return functions;
}

function getFunctionSignature(func: ts.FunctionDeclaration): string {
  const params = func.parameters.map(p => {
    const type = p.type ? p.type.getText() : 'any';
    return `${p.name.getText()}: ${type}`;
  });
  const returnType = func.type?.getText() || 'void';
  return `(${params.join(', ')}) => ${returnType}`;
}

export function semanticDiff(before: string, after: string): SemanticChange[] {
  const beforeFuncs = extractFunctions(before);
  const afterFuncs = extractFunctions(after);
  const changes: SemanticChange[] = [];
  
  // Detect additions
  const added = afterFuncs.filter(af => !beforeFuncs.some(bf => bf.name === af.name));
  added.forEach(f => changes.push({ type: 'add', symbol: f.name, details: `Function ${f.name} added` }));
  
  // Detect deletions
  const deleted = beforeFuncs.filter(bf => !afterFuncs.some(af => af.name === bf.name));
  deleted.forEach(f => changes.push({ type: 'delete', symbol: f.name, details: `Function ${f.name} deleted` }));
  
  // Detect signature changes
  const common = beforeFuncs.filter(bf => afterFuncs.find(af => af.name === bf.name));
  common.forEach(bf => {
    const af = afterFuncs.find(f => f.name === bf.name)!;
    if (bf.signature !== af.signature) {
      changes.push({
        type: 'signature_change',
        symbol: bf.name,
        before: bf.signature,
        after: af.signature,
        details: `Function ${bf.name} signature changed`
      });
    }
  });
  
  return changes;
}

export function generateCommitMessage(changes: SemanticChange[]): string {
  if (changes.length === 0) return 'refactor: internal changes';
  
  const addCount = changes.filter(c => c.type === 'add').length;
  const delCount = changes.filter(c => c.type === 'delete').length;
  const sigCount = changes.filter(c => c.type === 'signature_change').length;
  
  let header = 'refactor: ';
  if (addCount && !delCount && !sigCount) header = `feat: add ${changes.filter(c => c.type === 'add').map(c => c.symbol).join(', ')}`;
  else if (delCount && !addCount && !sigCount) header = `chore: remove ${changes.filter(c => c.type === 'delete').map(c => c.symbol).join(', ')}`;
  else if (sigCount === 1) header = `refactor: update ${changes.find(c => c.type === 'signature_change')?.symbol} signature`;
  else header = `refactor: ${changes.length} structural changes`;
  
  const body = changes.map(c => `- ${c.details}`).join('\n');
  return `${header}\n\n${body}`;
}

// Test with sample code
const beforeCode = `
function greet(name: string): void {
  console.log("Hello, " + name);
}
`;

const afterCode = `
function greet(greeting: string, name: string): void {
  console.log(greeting + ", " + name);
}

function farewell(name: string): void {
  console.log("Goodbye, " + name);
}
`;

const changes = semanticDiff(beforeCode, afterCode);
console.log('=== SEMANTIC CHANGES ===');
changes.forEach(c => console.log(`${c.type}: ${c.symbol} - ${c.details}`));
console.log('\n=== GENERATED COMMIT ===');
console.log(generateCommitMessage(changes));
