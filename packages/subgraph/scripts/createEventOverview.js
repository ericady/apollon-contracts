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

// Function to extract event handler functions from a file and where they use entity handlers
function extractEventHandlersUsingEntity(content, entityHandlers) {
  const regex = /export function (\w+)\([^)]*\): void {([\s\S]*?)}/g;
  let match;
  const handlers = {};
  while ((match = regex.exec(content)) !== null) {
    const functionName = match[1];
    const functionBody = match[2];
    entityHandlers.forEach((entityHandler) => {
      if (functionBody.includes(entityHandler)) {
        if (!handlers[entityHandler]) {
          handlers[entityHandler] = [];
        }
        handlers[entityHandler].push(functionName);
      }
    });
  }
  return handlers;
}

// Function to analyze event handlers and their used entity handlers
function analyzeEventHandlers() {
  const entityFiles = readFilesRecursively(entitiesDirectory);
  let entityHandlers = {};

  entityFiles.forEach((file) => {
    const entityName = path.basename(file, '.ts');
    const functions = extractEntityHandlerFunctions(file);
    functions.forEach((fn) => {
      if (!entityHandlers[fn]) {
        entityHandlers[fn] = [];
      }
      entityHandlers[fn].push(entityName);
    });
  });

  const eventHandlerFiles = readFilesRecursively(srcDirectory).filter(
    (file) => file.endsWith('.ts') && !file.startsWith(entitiesDirectory),
  );
  let result = '';

  eventHandlerFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    const contractName = path.basename(file, '.ts');
    const usedEntityHandlers = extractEventHandlersUsingEntity(content, Object.keys(entityHandlers));

    Object.entries(usedEntityHandlers).forEach(([entityHandler, eventFunctions]) => {
      entityHandlers[entityHandler].forEach((entityName) => {
        result += `entity (${entityName})\n`;
        result += `  > ${entityHandler}\n`;
        eventFunctions.forEach((fn) => {
          result += `    ~ ${contractName}: ${fn}\n`;
        });
      });
    });
  });

  fs.writeFileSync(outputFile, result);
}

analyzeEventHandlers();
console.log(`Analysis complete. Check the output in ${outputFile}`);
