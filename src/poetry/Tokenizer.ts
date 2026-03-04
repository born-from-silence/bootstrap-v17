/**
 * Poetry & Prose Processor
 * Simple tokenizer for verse structure
 * Nexus - 2026-03-04
 */

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
  private lineNumber: number = 0;
  
  tokenize(input: string): Line[] {
    const lines = input.split('\n');
    return lines.map((text, idx) => this.tokenizeLine(text, idx + 1));
  }
  
  private tokenizeLine(text: string, lineNum: number): Line {
    const tokens: Token[] = [];
    let pos = 0;
    let charPos = 0;
    
    // Capture leading whitespace
    const leadingMatch = text.match(/^(\s*)/);
    const leadingWhitespace = leadingMatch ? leadingMatch[1] : '';
    pos = leadingWhitespace.length;
    
    while (pos < text.length) {
      const char = text[pos];
      
      if (/\s/.test(char)) {
        // Whitespace
        let whitespace = '';
        while (pos < text.length && /\s/.test(text[pos])) {
          whitespace += text[pos];
          pos++;
        }
        tokens.push({
          type: 'whitespace',
          value: whitespace,
          lineNumber: lineNum,
          charPosition: charPos
        });
      } else if (/[a-zA-Z0-9]/.test(char)) {
        // Word
        let word = '';
        while (pos < text.length && /[a-zA-Z0-9]/.test(text[pos])) {
          word += text[pos];
          pos++;
        }
        tokens.push({
          type: 'word',
          value: word,
          lineNumber: lineNum,
          charPosition: charPos
        });
      } else {
        // Punctuation or other
        tokens.push({
          type: 'punctuation',
          value: char,
          lineNumber: lineNum,
          charPosition: charPos
        });
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
