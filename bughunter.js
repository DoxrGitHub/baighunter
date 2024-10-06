const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs-extra');

// Function to run Ollama command
async function runOllamaCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], { shell: true });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on('close', (code) => {
      resolve(output.trim());
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Initialize Ollama
async function initializeOllama() {
  try {
    await runOllamaCommand('ollama pull mistral');
    console.log('Ollama initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Ollama:', error);
    process.exit(1);
  }
}

// Custom commands
async function readFileTree(directory) {
  const files = await fs.readdir(directory, { withFileTypes: true });
  const tree = {};

  for (const file of files) {
    const filePath = path.join(directory, file.name);
    if (file.isDirectory()) {
      tree[file.name] = await readFileTree(filePath);
    } else {
      tree[file.name] = filePath;
    }
  }

  return tree;
}

async function generateMarkdown(vulnerabilityInfo) {
  const markdown = `# Vulnerability Report\n\n${vulnerabilityInfo.description}\n\n## Affected Code\n\`\`\`\n${vulnerabilityInfo.code}\n\`\`\`\n\n## Proof of Concept\n${vulnerabilityInfo.poc}`;
  return markdown;
}

async function analyzeCode(codePath) {
  const code = await fs.readFile(codePath, 'utf8');
  const vulnerabilityInfo = {
    description: 'Potential buffer overflow detected',
    code: code.slice(0, 100),
    poc: 'Buffer overflow attack vector: https://example.com'
  };
  return await generateMarkdown(vulnerabilityInfo);
}

// Global functions
global.readFileTree = readFileTree;
global.generateMarkdown = generateMarkdown;
global.analyzeCode = analyzeCode;

// Main function
async function main() {
  await initializeOllama();

  // Start the AI chat
  startChat();
}

main().catch(console.error);

function startChat() {
  let messageHistory = [];
  
  async function processMessage(message) {
    messageHistory.push(message);
    console.log('User:', message);
    
    let response;
    try {
      const client = new (require('ollama'))();
      response = await client.chat({
        model: 'mistral',
        messages: [{ role: 'user', content: message }],
        stream: false,
      });
      console.log('AI:', response.message.content);
    } catch (error) {
      console.error('Error processing message:', error);
    }

    messageHistory.push(response);
  }

  // Process user input
  process.stdin.setEncoding('utf8');
  process.stdin.on('readable', () => {
    let chunk;
    while ((chunk = process.stdin.read()) !== null) {
      processMessage(chunk.trim());
    }
  });

  // Add a prompt to start the conversation
  console.log("Type 'start' to begin the conversation.");
  process.stdin.on('data', (data) => {
    if (data.toString().trim() === 'start') {
      processMessage(data.toString().trim());
    }
  });
}
