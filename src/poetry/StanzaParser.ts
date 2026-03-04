/**
 * Stanza Parser
 * Identifies verse structure from tokenized lines
 * Nexus - 2026-03-04
 */

import { Line } from './Tokenizer';

export interface Stanza {
  lines: Line[];
  lineNumbers: number[];
  lineCount: number;
  leadingWhitespace: string;
}

export interface PoemStructure {
  stanzas: Stanza[];
  totalLines: number;
  totalStanzas: number;
  hasConsistentIndentation: boolean;
}

export class StanzaParser {
  parseStanzas(lines: Line[]): PoemStructure {
    const stanzas: Stanza[] = [];
    let currentStanzaLines: Line[] = [];
    
    for (const line of lines) {
      if (line.isEmpty && currentStanzaLines.length > 0) {
        // End of stanza
        stanzas.push(this.createStanza(currentStanzaLines));
        currentStanzaLines = [];
      } else if (!line.isEmpty) {
        currentStanzaLines.push(line);
      }
    }
    
    // Don't forget the last stanza
    if (currentStanzaLines.length > 0) {
      stanzas.push(this.createStanza(currentStanzaLines));
    }
    
    return {
      stanzas,
      totalLines: lines.filter(l => !l.isEmpty).length,
      totalStanzas: stanzas.length,
      hasConsistentIndentation: this.checkIndentationConsistency(stanzas)
    };
  }
  
  private createStanza(lines: Line[]): Stanza {
    const firstLine = lines[0];
    return {
      lines,
      lineNumbers: lines.map(l => l.lineNumber),
      lineCount: lines.length,
      leadingWhitespace: firstLine ? firstLine.leadingWhitespace : ''
    };
  }
  
  private checkIndentationConsistency(stanzas: Stanza[]): boolean {
    if (stanzas.length === 0) return true;
    const firstWhitespace = stanzas[0].leadingWhitespace;
    return stanzas.every(s => s.leadingWhitespace === firstWhitespace);
  }
  
  detectMeter(lines: Line[]): string {
    // Simple syllable counting per line
    const syllableCounts = lines.map(line => 
      this.countSyllablesInLine(line)
    );
    
    if (syllableCounts.length === 0) return 'unknown';
    
    // Check if consistent (potential metrical pattern)
    const uniqueCounts = [...new Set(syllableCounts)];
    const isConsistent = uniqueCounts.length <= 2; // Allow some variation
    
    const avgCount = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
    
    if (isConsistent && avgCount >= 9 && avgCount <= 11) {
      return 'likely-verse';
    } else if (avgCount > 15) {
      return 'likely-prose';
    }
    
    return 'mixed';
  }
  
  private countSyllablesInLine(line: Line): number {
    // Simple approximation: count vowel groups
    const text = line.text.toLowerCase();
    const vowelGroups = text.match(/[aeiouy]+/g);
    return vowelGroups ? vowelGroups.length : 0;
  }
}
