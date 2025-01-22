#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const chalk = require("chalk");
const { execSync } = require("child_process");

(async () => {
  console.log(
    chalk.green.bold("Welcome to the custom Node.js/Express project generator!")
  );

  // Prompt the user for inputs
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Enter your project name:",
      default: "server",
    },
    {
      type: "list",
      name: "language",
      message: "Select your preferred language:",
      choices: ["JavaScript", "TypeScript"],
    },
    {
      type: "confirm",
      name: "addGitignore",
      message: "Do you want to add a .gitignore file?",
      default: true,
    },
    {
      type: "confirm",
      name: "enableCORS",
      message: "Do you want to enable CORS?",
      default: true,
    },
    {
      type: "list",
      name: "apiType",
      message: "Which type of API do you want to use?",
      choices: ["REST API", "GraphQL"],
    },
  ]);

  const { projectName, language, addGitignore, enableCORS, apiType } = answers;

  // Create the project directory
  const projectPath = path.join(process.cwd(), projectName);
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath);
  }

  console.log(chalk.blue(`Creating project at ${projectPath}...`));

  // Initialize a package.json file
  execSync("npm init -y", { cwd: projectPath, stdio: "inherit" });

  // Update package.json scripts
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  packageJson.scripts = {
    start: "node dist/index.js",
    ...(language === "TypeScript" && {
      dev: 'tsc-watch --onSuccess "npm start"',
    }),
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Install dependencies
  const dependencies = ["express"];
  const devDependencies = [];
  if (language === "TypeScript") {
    devDependencies.push(
      "typescript",
      "@types/node",
      "@types/express",
      "ts-node",
      "tsc-watch"
    );
  }
  if (enableCORS) {
    dependencies.push("cors");
  }
  if (apiType === "GraphQL") {
    dependencies.push("graphql", "@apollo/server");
  }

  console.log(chalk.blue("Installing dependencies..."));
  execSync(`npm install ${dependencies.join(" ")}`, {
    cwd: projectPath,
    stdio: "inherit",
  });

  console.log(chalk.blue("Installing dev dependencies..."));
  execSync(`npm install -D ${devDependencies.join(" ")}`, {
    cwd: projectPath,
    stdio: "inherit",
  });

  // Remove node_modules
  console.log(chalk.yellow("Removing node_modules to defer installation..."));
  fs.rmSync(path.join(projectPath, "node_modules"), { recursive: true, force: true });
  fs.rmSync(path.join(projectPath, "package-lock.json"), { force: true });

  // Create basic files
  const mainFile = language === "TypeScript" ? "src/index.ts" : "src/index.js";
  const mainDir = path.join(projectPath, "src");
  if (!fs.existsSync(mainDir)) fs.mkdirSync(mainDir, { recursive: true });

  const serverCode = `
const express = require('express');
${enableCORS ? "const cors = require('cors');" : ""}

const app = express();
${enableCORS ? "app.use(cors());" : ""}

${
  apiType === "GraphQL"
    ? `
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");

async function init() {
    const app = express();
    app.use(express.json());
    const PORT = Number(process.env.PORT) || 8000;
    const gqlServer = new ApolloServer({
        typeDefs: "",
        resolvers: {},
    });
    await gqlServer.start();
    app.use("/graphql", expressMiddleware(gqlServer));
  
    app.listen(PORT, () => console.log(\`Server is started at port no: \${PORT}\`));
}
  
init();
  `
    : `
  app.use(express.json());
  app.get('/', (req, res) => {
    res.send('Welcome to your REST API!');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`
}

`;

  fs.writeFileSync(path.join(projectPath, mainFile), serverCode.trim());

  if (addGitignore) {
    const gitignoreContent = `
node_modules
.env
dist
`;
    fs.writeFileSync(
      path.join(projectPath, ".gitignore"),
      gitignoreContent.trim()
    );
  }

  if (language === "TypeScript") {
    const tsConfig = {
      compilerOptions: {
        target: "ES6",
        module: "CommonJS",
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
      },
    };
    fs.writeFileSync(
      path.join(projectPath, "tsconfig.json"),
      JSON.stringify(tsConfig, null, 2)
    );
  }

  console.log(chalk.green.bold("\nProject setup complete!"));
  console.log(chalk.cyan.bold("\nNext Steps:🚀"));
  console.log(chalk.cyan(`1. Navigate to your project folder:`));
  console.log(chalk.cyan(`   cd ${projectName}`));
  console.log(chalk.cyan(`2. Install dependencies:`));
  console.log(chalk.cyan(`   npm install`));
  console.log(chalk.cyan(`3. Start your server:`));
  console.log(chalk.cyan(`   npm start`));
  if (language === "TypeScript") {
    console.log(chalk.cyan(`   for development mode:`));
    console.log(chalk.cyan(`   npm run dev`));
  }

  console.log(chalk.magenta.bold("\nHappy coding! 🚀"));
})();
