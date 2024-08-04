import { existsSync, readFileSync } from 'fs';

// Loads environment variables from a file based on the current lifecycle event.
const loadEnvVariables = () => { 
  const env = process.env.npm_lifecycle_event || 'dev';
  const fileName = env.includes('test') || env.includes('cover') ? '.env.test' : '.env';

  if (existsSync(fileName)) {
    const envFileContent = readFileSync(fileName, 'utf-8');
    parseEnvFileContent(envFileContent);
  }
};


// Parses the content of the environment file and sets environment variables.
const parseEnvFileContent = (content) => {
  content.trim().split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key] = value;
    }
  });
};

export default loadEnvVariables;
