import fs from "fs";
import path from "path";
import git from "isomorphic-git";

async function setupGit() {
  const dir = path.resolve(".");
  console.log("Initializing Git repository in:", dir);

  // 1. Initialize Git repository
  await git.init({ fs, dir });
  console.log("Git repository initialized (.git directory created).");

  // Helper to recursively get files excluding node_modules, .git, etc.
  function getFiles(baseDir, relative = "") {
    const fullPath = path.join(baseDir, relative);
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    let files = [];

    for (const entry of entries) {
      const relPath = relative ? path.join(relative, entry.name).replace(/\\/g, "/") : entry.name;
      if (relPath.startsWith(".git") || 
          relPath.startsWith("node_modules") || 
          relPath.includes("/node_modules") || 
          relPath.startsWith("frontend/dist") ||
          relPath.startsWith(".system_generated")) {
        continue;
      }

      if (entry.isDirectory()) {
        files = files.concat(getFiles(baseDir, relPath));
      } else if (entry.isFile()) {
        files.push(relPath);
      }
    }
    return files;
  }

  const filesToAdd = getFiles(dir);
  console.log(`Staging ${filesToAdd.length} project files...`);

  for (const filepath of filesToAdd) {
    await git.add({ fs, dir, filepath });
  }
  console.log("All files staged.");

  // Commit
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: "muhamedarsath74-alt",
      email: "muhamedarsath74@gmail.com"
    },
    message: "feat: IoT Device Communication Monitoring and Validation System (CN, FSWD, FLAT)"
  });
  console.log("Commit created successfully with SHA:", sha);

  // Set branch to main
  await git.branch({ fs, dir, ref: "main", checkout: true });

  // Add remote origin
  const remoteUrl = "https://github.com/muhamedarsath74-alt/Iot.git";
  await git.setConfig({
    fs,
    dir,
    path: "remote.origin.url",
    value: remoteUrl
  });
  await git.setConfig({
    fs,
    dir,
    path: "remote.origin.fetch",
    value: "+refs/heads/*:refs/remotes/origin/*"
  });

  console.log(`Remote 'origin' set to: ${remoteUrl}`);
  console.log("Repository is fully initialized, committed, and ready for push!");
}

setupGit().catch(err => {
  console.error("Git setup error:", err);
  process.exit(1);
});
