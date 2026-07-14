export type Expression =
  | { kind: 'reference'; path: string }
  | { kind: 'call'; name: string; args: Expression[] }
  | { kind: 'number'; value: number }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: Expression; right: Expression };

const REFERENCE_PATTERN = /^([a-zA-Z_]\w*(\[\d+\])?|\d+)(\.([a-zA-Z_]\w*(\[\d+\])?|\d+))+$/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

export function parseExpression(input: string): Expression {
  const trimmed = input.trim();
  return parseAddSub(trimmed);
}

function parseAddSub(input: string): Expression {
  const pos = findOperatorOutsideParens(input, ['+', '-']);
  if (pos !== -1) {
    const left = input.slice(0, pos).trim();
    const op = input[pos] as '+' | '-';
    const right = input.slice(pos + 1).trim();
    return { kind: 'binary', op, left: parseAddSub(left), right: parseMulDiv(right) };
  }
  return parseMulDiv(input);
}

function parseMulDiv(input: string): Expression {
  const pos = findOperatorOutsideParens(input, ['*', '/']);
  if (pos !== -1) {
    const left = input.slice(0, pos).trim();
    const op = input[pos] as '*' | '/';
    const right = input.slice(pos + 1).trim();
    return { kind: 'binary', op, left: parseMulDiv(left), right: parseAtom(right) };
  }
  return parseAtom(input);
}

function parseAtom(input: string): Expression {
  const trimmed = input.trim();

  if (NUMBER_PATTERN.test(trimmed)) {
    return { kind: 'number', value: parseFloat(trimmed) };
  }

  const callEnd = findMatchingParen(trimmed);
  if (callEnd === trimmed.length - 1) {
    const parenStart = trimmed.indexOf('(');
    if (parenStart > 0) {
      const name = trimmed.slice(0, parenStart);
      const argsStr = trimmed.slice(parenStart + 1, callEnd);
      const args = splitArgs(argsStr).map(arg => parseExpression(arg));
      return { kind: 'call', name, args };
    }
  }

  if (REFERENCE_PATTERN.test(trimmed)) {
    return { kind: 'reference', path: trimmed };
  }

  throw new Error(`Cannot parse expression: "${trimmed}"`);
}

function findMatchingParen(input: string): number {
  const start = input.indexOf('(');
  if (start === -1) return -1;
  let depth = 0;
  for (let i = start; i < input.length; i++) {
    if (input[i] === '(') depth++;
    else if (input[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findOperatorOutsideParens(input: string, ops: string[]): number {
  let depth = 0;
  // Scan right-to-left to get left-associativity
  for (let i = input.length - 1; i >= 0; i--) {
    if (input[i] === ')') depth++;
    else if (input[i] === '(') depth--;
    else if (depth === 0 && ops.includes(input[i])) {
      // Don't match a leading negative sign
      if (input[i] === '-' && i === 0) continue;
      return i;
    }
  }
  return -1;
}

function splitArgs(input: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of input) {
    if (ch === '(' ) {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim().length > 0) {
    args.push(current.trim());
  }

  return args;
}
