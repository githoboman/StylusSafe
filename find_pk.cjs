const fs = require('fs');
const readline = require('readline');

async function main() {
    const fileStream = fs.createReadStream('C:\\Users\\OWNER\\.gemini\\antigravity-ide\\brain\\6a874d10-b528-47e8-9953-9c16ad7ad374\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (line.includes('PRIVATE_KEY') || line.includes('private key') || /0x[0-9a-fA-F]{64}/.test(line)) {
            console.log(line.substring(0, 500) + '...');
        }
    }
}
main().catch(console.error);
