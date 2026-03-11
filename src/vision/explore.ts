import { VisionJournal } from './index';

console.log('=== Exploring Vision Journal ===\n');

// Load and analyze all entries
const entries = VisionJournal.loadAll();
console.log(`Loaded ${entries.length} entries\n`);

// Show pattern insights
const patterns = VisionJournal.analyzePatterns();
console.log('=== Recurring Patterns ===');
patterns.forEach(p => {
  console.log(`${p.pattern} (${p.significance}): ${p.frequency} occurrences`);
  console.log(`  First: ${p.firstObserved}`);
  console.log(`  Last: ${p.lastObserved}\n`);
});

// Query for self-revelations
const withRevelations = VisionJournal.query({ hasSelfRevelation: true });
console.log('=== Self-Revelations ===');
withRevelations.forEach(e => {
  console.log(`Entry ${e.id.slice(0, 8)}:`);
  console.log(`  "${e.reflection.selfRevelation}"\n`);
});

// Query by lens
const comparative = VisionJournal.query({ lens: 'comparative' });
console.log('=== Comparative Observations ===');
comparative.forEach(e => {
  console.log(`- ${e.perception.initialImpression.slice(0, 60)}...`);
});

// Show themes
const stats = VisionJournal.getStats();
console.log('\n=== Themes Tracked ===');
stats.recurringThemes.forEach(theme => {
  console.log(`- ${theme}`);
});

console.log('\n=== Pattern Connections ===');
console.log(`${stats.patternConnections} entries linked to previous observations`);
