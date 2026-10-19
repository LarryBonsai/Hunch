import { getCatalog } from '../src/catalog.mjs';
const catalog = getCatalog();
const summary = catalog.summary();
console.log(`${summary.collection.name}: ${summary.collection.count} miejsc, ${summary.collection.count * 2} pytań liczbowych i ${summary.collection.count} pytań o mapę.`);
console.table(summary.topics.map(topic => ({ Temat: topic.name, Karty: topic.count, ...topic.metrics })));
catalog.close();
