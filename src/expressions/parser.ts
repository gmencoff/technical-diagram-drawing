export type Expression =
  | { kind: 'reference'; path: string }
  | { kind: 'call'; name: string; args: Expression[] };

const REFERENCE_PATTERN = /^[a-zA-Z_]\w*\.[a-zA-Z_]\w*$/;
const CALL_PATTERN = /^([a-zA-Z_]\w*)\((.+)\)$/;

export function parseExpression(input: string): Expression {
  const trimmed = input.trim();

  const callMatch = trimmed.match(CALL_PATTERN);
  if (callMatch) {
    const name = callMatch[1];
    const argsStr = callMatch[2];
    const args = splitArgs(argsStr).map(arg => parseExpression(arg));
    return { kind: 'call', name, args };
  }

  if (REFERENCE_PATTERN.test(trimmed)) {
    return { kind: 'reference', path: trimmed };
  }

  throw new Error(`Cannot parse expression: "${trimmed}"`);
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
