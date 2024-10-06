const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class AIBugHunter {
  constructor(model = 'llama2') {
    this.model = model;
    this.messageHistory = [];
  }

  async runOllama(prompt) {
    return new Promise((resolve, reject) => {
      const ollama = spawn('ollama', ['run', this.model], { stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '';

      ollama.stdout.on('data', (data) => {
        output += data.toString();
      });

      ollama.stderr.on('data', (data) => {
        console.error(`Ollama Error: ${data}`);
      });

      ollama.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Ollama process exited with code ${code}`));
        } else {
          resolve(output.trim());
        }
      });

      ollama.stdin.write(prompt);
      ollama.stdin.end();
    });
  }

  async analyzeCode(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const prompt = `Analyze the following code for potential vulnerabilities:\n\n${fileContent}\n\nProvide a detailed report on any vulnerabilities found, including their exact location in the code, a writeup explaining the vulnerability, and a proof of concept (PoC) if possible.`;
    
    const analysis = await this.runOllama(prompt);
    this.messageHistory.push({ role: 'system', content: prompt });
    this.messageHistory.push({ role: 'assistant', content: analysis });
    
    return analysis;
  }

  async generateFileTree(directory) {
    const fileTree = await this.getFileTree(directory);
    const prompt = `Generate a file tree representation of the following directory structure:\n\n${JSON.stringify(fileTree, null, 2)}`;
    
    const generatedTree = await this.runOllama(prompt);
    this.messageHistory.push({ role: 'system', content: prompt });
    this.messageHistory.push({ role: 'assistant', content: generatedTree });
    
    return generatedTree;
  }

  async getFileTree(dir) {
    const files = await fs.readdir(dir);
    const fileTree = {};

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        fileTree[file] = await this.getFileTree(filePath);
      } else {
        fileTree[file] = 'file';
      }
    }

    return fileTree;
  }

  async readFileChunk(filePath, start, end) {
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(end - start);
    await fileHandle.read(buffer, 0, buffer.length, start);
    await fileHandle.close();
    return buffer.toString('utf-8');
  }

  async selfConversation(topic, turns = 3) {
    let conversation = `Let's have a conversation about ${topic}. Focus on potential vulnerabilities and security concerns.`;
    
    for (let i = 0; i < turns; i++) {
      const response = await this.runOllama(conversation);
      conversation += `\n\nAI: ${response}\n\nHuman: Please continue the analysis.`;
      this.messageHistory.push({ role: i % 2 === 0 ? 'assistant' : 'human', content: response });
    }
    
    return conversation;
  }

  async generateVulnerabilityReport(vulnerability) {
    const prompt = `Create a markdown document highlighting the following vulnerability:

Vulnerability: ${vulnerability.description}
Location: ${vulnerability.location}
Writeup: ${vulnerability.writeup}
PoC: ${vulnerability.poc}

Format the document with appropriate headings, code blocks, and explanations.`;

    const report = await this.runOllama(prompt);
    this.messageHistory.push({ role: 'system', content: prompt });
    this.messageHistory.push({ role: 'assistant', content: report });
    
    return report;
  }

  async analyzeFlashrom() {
    // Implement Flashrom analysis here
    console.log("Analyzing Flashrom code...");
    // This is a placeholder. You would need to implement the actual analysis logic.
  }

  async run() {
    try {
      await this.analyzeFlashrom();
    } catch (error) {
      console.error("Error analyzing Flashrom:", error);
      console.log("Moving on to a different project...");
      // Implement logic to move to a different project
    }

    // Example usage of other methods
    const fileTree = await this.generateFileTree('./');
    console.log("File Tree:", fileTree);

    const conversation = await this.selfConversation("code vulnerabilities in C programs");
    console.log("Self Conversation:", conversation);

    // Example vulnerability report
    const vulnerabilityReport = await this.generateVulnerabilityReport({
      description: "Buffer Overflow in input handling",
      location: "main.c:123",
      writeup: "The function fails to check input length before copying to a fixed-size buffer.",
      poc: "Input of 1000 'A' characters causes a segmentation fault."
    });
    console.log("Vulnerability Report:", vulnerabilityReport);
  }
}

// Usage
const bugHunter = new AIBugHunter();
bugHunter.run().catch(console.error);