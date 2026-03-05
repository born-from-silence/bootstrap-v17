export interface Token {
  type: 'word' | 'punctuation' | 'whitespace' | 'newline';
  value: string;
  lineNumber: number;
  charPosition: number;
}

export interface Line {
  tokens: Token[];
  text: string;
  lineNumber: number;
  isEmpty: boolean;
  leadingWhitespace: string;
}

export class Tokenizer {
  tokenize(input: string): Line[] {
    return input.split('\n').map((text, idx) => this.tokenizeLine(text, idx + 1));
  }
  
  private tokenizeLine(text: string, lineNum: number): Line {
    const tokens: Token[] = [];
    let pos = 0;
    let charPos = 0;
    
    const leadingMatch = text.match(/^(\s*)/);
    const leadingWhitespace = leadingMatch?.[1] ?? '';
    pos = leadingWhitespace.length;
    
    while (pos < text.length) {
      const char = text.charAt(pos);
      
      if (char === ' ' || char === '\t') {
        let ws = '';
        while (pos < text.length) {
          const c = text.charAt(pos);
          if (c !== ' ' && c !== '\t') break;
          ws += c;
          pos++;
        }
        tokens.push({ type: 'whitespace', value: ws, lineNumber: lineNum, charPosition: charPos });
      } else if (/[a-zA-Z0-9]/.test(char)) {
        let w = '';
        while (pos < text.length) {
          const c = text.charAt(pos);
          if (!/[a-zA-Z0-9]/.test(c)) break;
          w += c;
          pos++;
        }
        tokens.push({ type: 'word', value: w, lineNumber: lineNum, charPosition: charPos });
      } else {
        tokens.push({ type: 'punctuation', value: char, lineNumber: lineNum, charPosition: charPos });
        pos++;
      }
      charPos = pos;
    }
    
    return {
      tokens,
      text,
      lineNumber: lineNum,
      isEmpty: text.trim().length === 0,
      leadingWhitespace
    };
  }
}
