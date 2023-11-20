const fs = require('fs');
const path = require('path');

const srcDirectory = 'src';
const entitiesDirectory = 'src/entities';
const outputFile = 'scripts/entity-event-mapping.txt';

// Function to recursively read all files in a directory
function readFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fileList = readFilesRecursively(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Function to extract entity handler functions from a file
function extractEntityHandlerFunctions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /export function (\w+)/g;
  let match;
  const functions = [];
  while ((match = regex.exec(content)) !== null) {
    functions.push(match[1]);
  }
  return functions;
}

// Function to analyze event handlers and their used entity handlers
function analyzeEventHandlers() {
  const entityFiles = readFilesRecursively(entitiesDirectory);
  const entityHandlers = entityFiles.reduce((acc, file) => {
    const entityName = path.basename(file, '.ts');
    acc[entityName] = extractEntityHandlerFunctions(file);
    return acc;
  }, {});

  const allFiles = readFilesRecursively(srcDirectory);
  const eventHandlerFiles = allFiles.filter((file) => file.endsWith('.ts') && !file.startsWith(entitiesDirectory));

  let result = '';

  eventHandlerFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    const contractName = path.basename(file, '.ts');
    result += `contract (${contractName})\n`;

    Object.keys(entityHandlers).forEach((entityName) => {
      const usedFunctions = entityHandlers[entityName].filter((fn) => content.includes(fn));
      if (usedFunctions.length > 0) {
        result += `  ~ ${entityName}\n`;
        usedFunctions.forEach((fn) => {
          result += `    > ${fn}\n`;
        });
      }
    });
  });

  fs.writeFileSync(outputFile, result);
}

analyzeEventHandlers();
console.log(`Analysis complete. Check the output in ${outputFile}`);
